import { Hono } from 'hono'
import type { ZodError } from 'zod'
import {
  apiError,
  chatTurnResponseSchema,
  createTrainingInputSchema,
  drillAnswerResponseSchema,
  drillRoundResponseSchema,
  GAPS_TARGETS_DEFAULT,
  PICK_LIMIT_DEFAULT,
  SMUGGLE_TARGETS_DEFAULT,
  sendMessageInputSchema,
  trainingListQuerySchema,
  trainingListResponseSchema,
  trainingSchema,
  type Assessment,
  type ChatMessage,
  type ChatTraining,
  type DrillRound,
  type Expression,
  type Narrative,
  type SrsEffect,
  type Training,
  type TrainingTarget,
  type TrainingType,
} from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'
import { drillStrategies } from '../drills/registry'
import type { DrillJudgement } from '../drills/strategy'
import { withRetry } from '../llm/retry'
import { SrsService } from '../srs/service'
import { aggregateSession } from './aggregator'

const fieldMessage = ({ issues }: ZodError) =>
  issues.map(({ path, message }) => (path.length ? `${path.join('.')}: ${message}` : message)).join('; ')

/** How many phrases a session picks when the client names none. */
const DEFAULT_TARGETS: Record<TrainingType, number> = {
  chat: PICK_LIMIT_DEFAULT,
  gaps: GAPS_TARGETS_DEFAULT,
  describe: PICK_LIMIT_DEFAULT,
  smuggle: SMUGGLE_TARGETS_DEFAULT,
}

const snapshot = ({ id, expression, meaning }: Expression): TrainingTarget => ({
  expressionId: id,
  expression,
  meaning,
})

/** The assessor sometimes names a phrase nobody asked about; a key outside the session's targets is dropped. */
const onlyTargets = (assessment: Assessment, targets: TrainingTarget[]): Assessment => {
  const known = new Set(targets.map((target) => target.expression))

  return {
    ...assessment,
    targetPhrasesCorrectness: Object.fromEntries(
      Object.entries(assessment.targetPhrasesCorrectness).filter(([expression]) => known.has(expression)),
    ),
  }
}

/**
 * A send that already landed is replayed rather than run again: the client retries when a turn's
 * response never arrives, and without this the same message would be answered and stored twice.
 */
const alreadyTaken = (training: ChatTraining, turnId: string) => {
  const index = training.messages.findIndex((message) => message.turnId === turnId)
  const sent = training.messages[index]
  const reply = training.messages[index + 1]

  return sent?.assessment && reply ? { reply, assessment: sent.assessment, index } : undefined
}

const scoredTargets = (assessment: Assessment, targets: TrainingTarget[]) =>
  new Map(
    targets
      .map(({ expressionId, expression }) => [expressionId, assessment.targetPhrasesCorrectness[expression]?.score])
      .filter((entry): entry is [string, number] => entry[1] !== undefined),
  )

export const trainingRoutes = (deps: Pick<Deps, 'trainings' | 'expressions' | 'llm' | 'clock'>) => {
  const srs = new SrsService(deps.expressions, deps.clock)
  const strategies = drillStrategies(deps.llm)

  const roundsOf = (training: Training): DrillRound[] | undefined =>
    training.type === 'chat' ? undefined : training.rounds

  /** An answer key never leaves the server while its round is still open. */
  const shown = (training: Training) => {
    const rounds = roundsOf(training)
    const strategy = strategies[training.type]

    return rounds && strategy ? { ...training, rounds: rounds.map((round) => strategy.redact(round)) } : training
  }

  return new Hono<AuthEnv>()
    .post('/trainings', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const input = createTrainingInputSchema.safeParse(body)
      if (!input.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(input.error)), 400)

      const userId = c.get('userId')
      const now = deps.clock()
      const { expressionIds, limit, ...rest } = input.data

      let targets: TrainingTarget[]
      if (expressionIds) {
        const found = await Promise.all(expressionIds.map((id) => deps.expressions.findById(userId, id)))
        if (found.some((expression) => !expression)) {
          return c.json(apiError('EXPRESSION_NOT_FOUND', 'One of those expressions is no longer in your vocabulary'), 404)
        }
        targets = found.map((expression) => snapshot(expression as Expression))
      } else {
        const fallback = DEFAULT_TARGETS[rest.type]
        const picked = await deps.expressions.pick(userId, { limit: limit ?? fallback, now })
        targets = picked.map(snapshot)
      }

      if (rest.type !== 'chat') {
        const created = await deps.trainings.create(userId, {
          type: rest.type,
          status: 'ACTIVE',
          targets,
          rounds: [],
          srsEffects: [],
          createdAt: now,
        })

        return c.json(trainingSchema.parse(shown(created)), 201)
      }

      let opening: string
      try {
        opening = await deps.llm.tutorFirstMessage({ context: rest.context, style: rest.style, targets })
      } catch (error) {
        console.error(error)

        return c.json(apiError('LLM_UNAVAILABLE', 'Could not start this conversation'), 502)
      }

      const created = await deps.trainings.create(userId, {
        ...rest,
        status: 'ACTIVE',
        targets,
        messages: [{ role: 'assistant', content: opening, createdAt: now }],
        srsEffects: [],
        createdAt: now,
      })

      return c.json(trainingSchema.parse(shown(created)), 201)
    })
    .get('/trainings', async (c) => {
      const query = trainingListQuerySchema.safeParse(c.req.query())
      if (!query.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(query.error)), 400)

      const { limit } = query.data
      const found = await deps.trainings.list(c.get('userId'), { ...query.data, limit: limit + 1 })
      const items = found.slice(0, limit)
      const nextBefore = found.length > limit ? items.at(-1)?.createdAt : undefined

      return c.json(trainingListResponseSchema.parse({ items, nextBefore }))
    })
    .post('/trainings/:id/messages', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const input = sendMessageInputSchema.safeParse(body)
      if (!input.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(input.error)), 400)

      const userId = c.get('userId')
      const training = await deps.trainings.findById(userId, c.req.param('id'))
      if (!training) return c.json(apiError('NOT_FOUND', 'No such training'), 404)
      if (training.type !== 'chat') return c.json(apiError('NOT_A_CHAT', 'This session takes rounds, not messages'), 409)
      if (training.status !== 'ACTIVE') {
        return c.json(apiError('TRAINING_NOT_ACTIVE', 'This conversation is already over'), 409)
      }

      const { context, style, targets, messages } = training
      const { content, turnId } = input.data

      const taken = alreadyTaken(training, turnId)
      if (taken) {
        const { index, ...replayed } = taken

        return c.json(
          chatTurnResponseSchema.parse({
            ...replayed,
            srsEffects: training.srsEffects.filter(({ source }) => source.index === index),
            training,
          }),
        )
      }
      const tutorMessage = [...messages].reverse().find((message) => message.role === 'assistant')?.content

      let reply: string
      let assessed: Assessment
      try {
        ;[reply, assessed] = await Promise.all([
          withRetry(() => deps.llm.tutorReply({ context, style, targets, history: messages, userContent: content }), {
            attempts: 2,
          }),
          withRetry(
            () => deps.llm.assessMessage({ context, style, targets, userContent: content, tutorMessage }),
            { attempts: 2 },
          ),
        ])
      } catch (error) {
        console.error(error)

        return c.json(apiError('LLM_UNAVAILABLE', 'Could not answer this message'), 502)
      }

      const now = deps.clock()
      const assessment = onlyTargets(assessed, targets)
      const turn: ChatMessage[] = [
        { role: 'user', content, turnId, createdAt: now, assessment },
        { role: 'assistant', content: reply, createdAt: now },
      ]
      const updated = await deps.trainings.appendMessages(userId, training.id, turn, messages.length)
      if (!updated) return c.json(apiError('TURN_CONFLICT', 'This conversation moved on — reopen it'), 409)

      // The turn is committed by this point, so a failure here must not answer with a retryable error:
      // a replay exits at alreadyTaken and never reaches this, so a dropped update is dropped for good.
      // The expression stays due and its next practice carries it forward.
      const source = { kind: 'message', index: messages.length } as const
      let srsEffects: SrsEffect[] = []
      let stored = updated
      try {
        const { effects, failures } = await srs.apply(userId, targets, scoredTargets(assessment, targets))
        if (failures.length) console.error('srs.apply failed', { trainingId: training.id, turnId }, failures)

        srsEffects = effects.map((effect) => ({ ...effect, source }))
        if (srsEffects.length) {
          await withRetry(() => deps.trainings.appendSrsEffects(userId, training.id, srsEffects), { attempts: 2 })
          stored = { ...updated, srsEffects: [...updated.srsEffects, ...srsEffects] }
        }
      } catch (error) {
        console.error('srs write-back failed', { trainingId: training.id, turnId, srsEffects }, error)
      }

      return c.json(chatTurnResponseSchema.parse({ reply: turn[1], assessment, srsEffects, training: stored }))
    })
    .post('/trainings/:id/rounds', async (c) => {
      const userId = c.get('userId')
      const training = await deps.trainings.findById(userId, c.req.param('id'))
      if (!training) return c.json(apiError('NOT_FOUND', 'No such training'), 404)

      const rounds = roundsOf(training)
      const strategy = strategies[training.type]
      if (!rounds || !strategy) return c.json(apiError('NOT_A_DRILL', 'This session has no rounds'), 409)
      if (training.status !== 'ACTIVE') {
        return c.json(apiError('TRAINING_NOT_ACTIVE', 'This session is already over'), 409)
      }

      // A retry after a lost response must replay the committed round rather than deal — and pay for — another.
      const open = rounds.at(-1)
      if (open && !open.answeredAt) {
        return c.json(drillRoundResponseSchema.parse({ round: strategy.redact(open), training: shown(training) }))
      }

      let round: DrillRound
      try {
        round = await strategy.generate({ index: rounds.length, targets: training.targets })
      } catch (error) {
        console.error(error)

        return c.json(apiError('LLM_UNAVAILABLE', 'Could not put together a round'), 502)
      }

      const updated = await deps.trainings.appendRound(userId, training.id, round, rounds.length)
      if (!updated) return c.json(apiError('TURN_CONFLICT', 'This session moved on — reopen it'), 409)

      return c.json(drillRoundResponseSchema.parse({ round: strategy.redact(round), training: shown(updated) }))
    })
    .post('/trainings/:id/rounds/:index/answer', async (c) => {
      const userId = c.get('userId')
      const training = await deps.trainings.findById(userId, c.req.param('id'))
      if (!training) return c.json(apiError('NOT_FOUND', 'No such training'), 404)

      const rounds = roundsOf(training)
      const strategy = strategies[training.type]
      if (!rounds || !strategy) return c.json(apiError('NOT_A_DRILL', 'This session has no rounds'), 409)
      if (training.status !== 'ACTIVE') {
        return c.json(apiError('TRAINING_NOT_ACTIVE', 'This session is already over'), 409)
      }

      const index = Number(c.req.param('index'))
      const round = Number.isInteger(index) ? rounds[index] : undefined
      if (!round) return c.json(apiError('ROUND_NOT_FOUND', 'No such round in this session'), 404)
      if (round.answeredAt) return c.json(apiError('ROUND_ALREADY_ANSWERED', 'This round is already checked'), 409)

      let judged: DrillJudgement
      try {
        judged = await strategy.judge(round, await c.req.json().catch(() => undefined))
      } catch (error) {
        console.error(error)

        return c.json(apiError('LLM_UNAVAILABLE', 'Could not judge that answer'), 502)
      }
      if (!judged.ok) return c.json(apiError(judged.code, judged.message), 400)

      const now = deps.clock()
      const updated = await deps.trainings.answerRound(userId, training.id, index, {
        answer: judged.answer,
        verdict: judged.verdict,
        answeredAt: now,
      })
      if (!updated) return c.json(apiError('ROUND_ALREADY_ANSWERED', 'This round is already checked'), 409)

      // Judging is committed by this point, so a failed SRS write must not answer with a retryable error:
      // the expression simply stays due and its next practice carries it forward.
      const source = { kind: 'round', index } as const
      const scored = { ...round, answer: judged.answer, verdict: judged.verdict, answeredAt: now }
      let srsEffects: SrsEffect[] = []
      let stored = updated
      try {
        const { effects, failures } = await srs.apply(userId, round.targets, strategy.scoresFor(scored))
        if (failures.length) console.error('srs.apply failed', { trainingId: training.id, index }, failures)

        srsEffects = effects.map((effect) => ({ ...effect, source }))
        if (srsEffects.length) {
          await withRetry(() => deps.trainings.appendSrsEffects(userId, training.id, srsEffects), { attempts: 2 })
          stored = { ...updated, srsEffects: [...updated.srsEffects, ...srsEffects] }
        }
      } catch (error) {
        console.error('srs write-back failed', { trainingId: training.id, index, srsEffects }, error)
      }

      return c.json(
        drillAnswerResponseSchema.parse({
          round: strategy.redact(scored),
          verdict: judged.verdict,
          srsEffects,
          training: shown(stored),
        }),
      )
    })
    .post('/trainings/:id/complete', async (c) => {
      const userId = c.get('userId')
      const training = await deps.trainings.findById(userId, c.req.param('id'))
      if (!training) return c.json(apiError('NOT_FOUND', 'No such training'), 404)
      if (training.status !== 'ACTIVE') {
        return c.json(apiError('TRAINING_NOT_ACTIVE', 'This conversation is already over'), 409)
      }

      if (training.type !== 'chat') {
        const strategy = strategies[training.type]
        if (!strategy) return c.json(apiError('NOT_A_DRILL', 'This session has no rounds'), 409)

        const finished = await deps.trainings.completeDrill(
          userId,
          training.id,
          strategy.aggregate(training.rounds),
          deps.clock(),
          {
            rounds: training.rounds.length,
            answered: training.rounds.filter((round) => round.answeredAt).length,
          },
        )
        if (!finished) {
          const current = await deps.trainings.findById(userId, training.id)

          return current?.status === 'ACTIVE'
            ? c.json(apiError('TURN_CONFLICT', 'This session moved on — reopen it'), 409)
            : c.json(apiError('TRAINING_NOT_ACTIVE', 'This session is already over'), 409)
        }

        return c.json(trainingSchema.parse(shown(finished)))
      }

      const aggregate = aggregateSession(training.messages, training.targets)

      let narrative: Narrative
      try {
        narrative = await withRetry(() => deps.llm.summarizeSession(aggregate), { attempts: 2 })
      } catch (error) {
        console.error(error)

        return c.json(apiError('LLM_UNAVAILABLE', 'Could not sum up this conversation'), 502)
      }

      const completed = await deps.trainings.complete(
        userId,
        training.id,
        { ...aggregate, narrative, computedAt: deps.clock() },
        training.messages.length,
      )
      if (!completed) {
        const current = await deps.trainings.findById(userId, training.id)

        return current?.status === 'ACTIVE'
          ? c.json(apiError('TURN_CONFLICT', 'This conversation moved on — reopen it'), 409)
          : c.json(apiError('TRAINING_NOT_ACTIVE', 'This conversation is already over'), 409)
      }

      return c.json(trainingSchema.parse(shown(completed)))
    })
    .post('/trainings/:id/cancel', async (c) => {
      const userId = c.get('userId')
      const id = c.req.param('id')

      const canceled = await deps.trainings.cancel(userId, id, deps.clock())
      if (canceled) return c.json(trainingSchema.parse(shown(canceled)))

      return (await deps.trainings.findById(userId, id))
        ? c.json(apiError('TRAINING_NOT_ACTIVE', 'This conversation is already over'), 409)
        : c.json(apiError('NOT_FOUND', 'No such training'), 404)
    })
    .get('/trainings/:id', async (c) => {
      const training = await deps.trainings.findById(c.get('userId'), c.req.param('id'))
      if (!training) return c.json(apiError('NOT_FOUND', 'No such training'), 404)

      return c.json(trainingSchema.parse(shown(training)))
    })
}

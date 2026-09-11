import { Hono } from 'hono'
import type { ZodError } from 'zod'
import {
  apiError,
  chatTurnResponseSchema,
  createTrainingInputSchema,
  PICK_LIMIT_DEFAULT,
  sendMessageInputSchema,
  trainingSchema,
  type Assessment,
  type ChatMessage,
  type ChatTraining,
  type Expression,
  type SrsEffect,
  type TrainingTarget,
} from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'
import { withRetry } from '../llm/retry'
import { SrsService } from '../srs/service'

const fieldMessage = ({ issues }: ZodError) =>
  issues.map(({ path, message }) => (path.length ? `${path.join('.')}: ${message}` : message)).join('; ')

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

  return new Hono<AuthEnv>()
    .post('/trainings', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const input = createTrainingInputSchema.safeParse(body)
      if (!input.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(input.error)), 400)

      const userId = c.get('userId')
      const now = deps.clock()
      const { expressionIds, limit, ...chat } = input.data

      let targets: TrainingTarget[]
      if (expressionIds) {
        const found = await Promise.all(expressionIds.map((id) => deps.expressions.findById(userId, id)))
        if (found.some((expression) => !expression)) {
          return c.json(apiError('EXPRESSION_NOT_FOUND', 'One of those expressions is no longer in your vocabulary'), 404)
        }
        targets = found.map((expression) => snapshot(expression as Expression))
      } else {
        const picked = await deps.expressions.pick(userId, { limit: limit ?? PICK_LIMIT_DEFAULT, now })
        targets = picked.map(snapshot)
      }

      let opening: string
      try {
        opening = await deps.llm.tutorFirstMessage({ context: chat.context, style: chat.style, targets })
      } catch (error) {
        console.error(error)

        return c.json(apiError('LLM_UNAVAILABLE', 'Could not start this conversation'), 502)
      }

      const created = await deps.trainings.create(userId, {
        ...chat,
        status: 'ACTIVE',
        targets,
        messages: [{ role: 'assistant', content: opening, createdAt: now }],
        srsEffects: [],
        createdAt: now,
      })

      return c.json(trainingSchema.parse(created), 201)
    })
    .post('/trainings/:id/messages', async (c) => {
      const body = await c.req.json().catch(() => undefined)
      const input = sendMessageInputSchema.safeParse(body)
      if (!input.success) return c.json(apiError('VALIDATION_ERROR', fieldMessage(input.error)), 400)

      const userId = c.get('userId')
      const training = await deps.trainings.findById(userId, c.req.param('id'))
      if (!training) return c.json(apiError('NOT_FOUND', 'No such training'), 404)
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
    .get('/trainings/:id', async (c) => {
      const training = await deps.trainings.findById(c.get('userId'), c.req.param('id'))
      if (!training) return c.json(apiError('NOT_FOUND', 'No such training'), 404)

      return c.json(trainingSchema.parse(training))
    })
}

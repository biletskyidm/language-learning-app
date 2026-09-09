import { Hono } from 'hono'
import type { ZodError } from 'zod'
import {
  apiError,
  createTrainingInputSchema,
  PICK_LIMIT_DEFAULT,
  trainingSchema,
  type Expression,
  type TrainingTarget,
} from '@contracts'
import type { AuthEnv } from '../auth/middleware'
import type { Deps } from '../deps'

const fieldMessage = ({ issues }: ZodError) =>
  issues.map(({ path, message }) => (path.length ? `${path.join('.')}: ${message}` : message)).join('; ')

const snapshot = ({ id, expression, meaning }: Expression): TrainingTarget => ({
  expressionId: id,
  expression,
  meaning,
})

export const trainingRoutes = (deps: Pick<Deps, 'trainings' | 'expressions' | 'llm' | 'clock'>) =>
  new Hono<AuthEnv>()
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
        createdAt: now,
      })

      return c.json(trainingSchema.parse(created), 201)
    })
    .get('/trainings/:id', async (c) => {
      const training = await deps.trainings.findById(c.get('userId'), c.req.param('id'))
      if (!training) return c.json(apiError('NOT_FOUND', 'No such training'), 404)

      return c.json(trainingSchema.parse(training))
    })

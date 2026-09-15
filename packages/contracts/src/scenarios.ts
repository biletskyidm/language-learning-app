import { z } from 'zod'
import { chatStyleSchema, type ChatStyle } from './trainings'

export const SCENARIO_NAME_MAX = 60
export const SCENARIO_CONTEXT_MAX = 500

export const scenarioSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  context: z.string(),
  style: chatStyleSchema,
  createdAt: z.coerce.date(),
})

export const createScenarioInputSchema = z.object({
  name: z.string().trim().min(1).max(SCENARIO_NAME_MAX),
  context: z.string().trim().min(1).max(SCENARIO_CONTEXT_MAX),
  style: chatStyleSchema,
})

export const updateScenarioInputSchema = createScenarioInputSchema.partial().strict()

export const scenarioListResponseSchema = z.object({ items: z.array(scenarioSchema) })

export type Scenario = z.infer<typeof scenarioSchema>
export type CreateScenarioInput = z.infer<typeof createScenarioInputSchema>
export type UpdateScenarioInput = z.infer<typeof updateScenarioInputSchema>
export type ScenarioListResponse = z.infer<typeof scenarioListResponseSchema>

export const DEFAULT_SCENARIOS: { name: string; context: string; style: ChatStyle }[] = [
  {
    name: 'Scrum standup',
    context: 'A morning scrum standup with my team: what I did yesterday, what I am on today, what is blocking me.',
    style: 'informal',
  },
  {
    name: 'Job interview',
    context: 'A job interview for a senior engineering role, answering questions about my experience and my work.',
    style: 'formal',
  },
  {
    name: 'Catching up with a friend',
    context: 'Catching up with an old friend over coffee about what we have both been up to lately.',
    style: 'informal',
  },
  {
    name: 'Customer support email thread',
    context: 'An email thread with a customer chasing a problem with our product, apologising and explaining the fix.',
    style: 'formal',
  },
]

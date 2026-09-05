import { z } from 'zod'

const configSchema = z.object({
  PORT: z.coerce.number().default(8787),
  MONGO_URI: z.string().min(1),
  MONGO_DB: z.string().min(1),
  USER_ID: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  OPENROUTER_API_KEY: z.string().optional(),
  REPLY_MODEL: z.string().optional(),
  ASSESSMENT_MODEL: z.string().optional(),
  NARRATIVE_MODEL: z.string().optional(),
  DRAFT_MODEL: z.string().optional(),
  DRILL_GEN_MODEL: z.string().optional(),
  DRILL_JUDGE_MODEL: z.string().optional(),
  LANGSMITH_TRACING: z.enum(['true', 'false']).default('false'),
  LANGSMITH_API_KEY: z.string().optional(),
  LANGSMITH_PROJECT: z.string().optional(),
})

export type Config = z.infer<typeof configSchema>

export const loadConfig = (env: NodeJS.ProcessEnv): Config => {
  const parsed = configSchema.safeParse(env)
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ')
    throw new Error(`Invalid environment:\n  ${details}`)
  }
  return parsed.data
}

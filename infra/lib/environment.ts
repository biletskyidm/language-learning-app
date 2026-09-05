const REQUIRED = ['AUTH_SECRET', 'USER_ID', 'MONGO_URI', 'MONGO_DB'] as const

const OPTIONAL = [
  'OPENROUTER_API_KEY',
  'REPLY_MODEL',
  'ASSESSMENT_MODEL',
  'NARRATIVE_MODEL',
  'DRAFT_MODEL',
  'DRILL_GEN_MODEL',
  'DRILL_JUDGE_MODEL',
  'LANGSMITH_TRACING',
  'LANGSMITH_API_KEY',
  'LANGSMITH_PROJECT',
] as const

export const lambdaEnvironment = (env: Record<string, string | undefined>): Record<string, string> => {
  const missing = REQUIRED.filter((key) => !env[key])
  if (missing.length > 0) throw new Error(`Missing in infra/.env: ${missing.join(', ')}`)

  return Object.fromEntries([
    ...REQUIRED.map((key) => [key, env[key]]),
    ...OPTIONAL.map((key) => [key, env[key] ?? '']),
  ])
}

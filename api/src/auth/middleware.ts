import { createMiddleware } from 'hono/factory'
import { apiError } from '@contracts'
import type { Deps } from '../deps'

export type AuthEnv = { Variables: { userId: string } }

/** The failure reason is deliberately not echoed: a caller learns only that the token was refused. */
export const requireAuth = (deps: Pick<Deps, 'tokenVerifier' | 'userId'>) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    if (!deps.tokenVerifier.verify(c.req.header('Authorization')).ok) {
      return c.json(apiError('UNAUTHORIZED', 'Missing or invalid bearer token'), 401)
    }
    c.set('userId', deps.userId)
    await next()
  })

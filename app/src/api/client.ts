import * as Crypto from 'expo-crypto'
import { apiErrorSchema, generateToken } from '@contracts'
import type { ZodType } from 'zod'
import { readCredentials } from './credentials'

export class UnauthorizedError extends Error {
  constructor() {
    super('The API rejected the shared secret')
    this.name = 'UnauthorizedError'
  }
}

export class NotConfiguredError extends Error {
  constructor() {
    super('No API URL and secret configured')
    this.name = 'NotConfiguredError'
  }
}

const bearer = (secret: string) =>
  `Bearer ${generateToken(secret, {
    now: () => new Date(),
    random: (size) => Crypto.getRandomValues(new Uint8Array(size)),
  })}`

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const request = async <T>(method: string, path: string, schema: ZodType<T>, body?: unknown): Promise<T> => {
  const credentials = await readCredentials()
  if (!credentials) throw new NotConfiguredError()

  const res = await fetch(`${credentials.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: bearer(credentials.secret),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401) throw new UnauthorizedError()

  const payload = await res.json().catch(() => undefined)
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(payload)
    throw parsed.success
      ? new ApiError(res.status, parsed.data.error.code, parsed.data.error.message)
      : new Error(`${method} ${path} failed with ${res.status}`)
  }

  return schema.parse(payload)
}

export const apiGet = <T>(path: string, schema: ZodType<T>): Promise<T> => request('GET', path, schema)

export const apiPost = <T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> =>
  request('POST', path, schema, body)

export const apiPatch = <T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> =>
  request('PATCH', path, schema, body)

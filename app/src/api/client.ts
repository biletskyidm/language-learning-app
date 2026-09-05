import * as Crypto from 'expo-crypto'
import { generateToken } from '@contracts'
import type { ZodType } from 'zod'
import { readCredentials } from './credentials'

/** The API refused our token: the stored secret no longer matches the backend's. */
export class UnauthorizedError extends Error {
  constructor() {
    super('The API rejected the shared secret')
    this.name = 'UnauthorizedError'
  }
}

/** Setup has not run yet, so there is no API URL or secret to call with. */
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

export const apiGet = async <T>(path: string, schema: ZodType<T>): Promise<T> => {
  const credentials = await readCredentials()
  if (!credentials) throw new NotConfiguredError()

  const res = await fetch(`${credentials.baseUrl}${path}`, {
    headers: { Authorization: bearer(credentials.secret) },
  })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`)

  return schema.parse(await res.json())
}

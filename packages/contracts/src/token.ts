import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

export const TOKEN_MAX_AGE_SECONDS = 120

const NONCE_BYTES = 16
const NONCE_PATTERN = /^[0-9a-f]{32}$/
const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/
const TIMESTAMP_PATTERN = /^\d+$/

/** Replay guard is best-effort: a nonce is only remembered for a bounded window. */
export interface NonceStore {
  claim(nonce: string, at: Date): boolean
}

export interface GenerateTokenOptions {
  now: () => Date
  random: (size: number) => Uint8Array
}

export interface VerifyTokenOptions {
  now: () => Date
  seen: NonceStore
}

export type TokenFailure = 'MALFORMED' | 'INVALID_SIGNATURE' | 'STALE' | 'REPLAYED'

export type TokenVerification = { ok: true } | { ok: false; reason: TokenFailure }

const unixSeconds = (at: Date) => Math.floor(at.getTime() / 1000)

const sign = (secret: string, ts: string, nonce: string) =>
  bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(`${ts}.${nonce}`)))

const equalsInConstantTime = (a: string, b: string) => {
  let diff = a.length ^ b.length
  for (let i = 0; i < a.length && i < b.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const generateToken = (secret: string, { now, random }: GenerateTokenOptions): string => {
  const ts = String(unixSeconds(now()))
  const nonce = bytesToHex(random(NONCE_BYTES))
  return `${ts}.${nonce}.${sign(secret, ts, nonce)}`
}

const bearerToken = (header: string | undefined | null) => {
  const parts = header?.split(' ') ?? []
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : undefined
}

export const verifyToken = (
  secret: string,
  header: string | undefined | null,
  { now, seen }: VerifyTokenOptions,
): TokenVerification => {
  const segments = bearerToken(header)?.split('.') ?? []
  const [ts, nonce, signature] = segments
  if (segments.length !== 3 || !ts || !nonce || !signature) return { ok: false, reason: 'MALFORMED' }
  if (!TIMESTAMP_PATTERN.test(ts) || !NONCE_PATTERN.test(nonce) || !SIGNATURE_PATTERN.test(signature)) {
    return { ok: false, reason: 'MALFORMED' }
  }

  if (!equalsInConstantTime(signature, sign(secret, ts, nonce))) {
    return { ok: false, reason: 'INVALID_SIGNATURE' }
  }

  const at = now()
  if (Math.abs(unixSeconds(at) - Number(ts)) > TOKEN_MAX_AGE_SECONDS) return { ok: false, reason: 'STALE' }
  if (!seen.claim(nonce, at)) return { ok: false, reason: 'REPLAYED' }

  return { ok: true }
}

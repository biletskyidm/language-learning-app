import { describe, expect, it } from 'vitest'
import { generateToken, verifyToken, type NonceStore } from '../src/token'

const SECRET = 'a'.repeat(64)

const at = (iso: string) => () => new Date(iso)

const freshStore = (): NonceStore => {
  const used = new Set<string>()
  return { claim: (nonce) => (used.has(nonce) ? false : (used.add(nonce), true)) }
}

const sequentialRandom = () => {
  let n = 0
  return (size: number) => Uint8Array.from({ length: size }, (_, i) => (i === 0 ? n++ : i))
}

describe('generateToken', () => {
  it('produces a ts.nonce.signature triple', () => {
    const token = generateToken(SECRET, { now: at('2026-01-01T00:00:00Z'), random: sequentialRandom() })

    const [ts, nonce, sig] = token.split('.')
    expect(ts).toBe('1767225600')
    expect(nonce).toMatch(/^[0-9a-f]{32}$/)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  it('uses a fresh nonce on every call', () => {
    const options = { now: at('2026-01-01T00:00:00Z'), random: sequentialRandom() }

    const first = generateToken(SECRET, options)
    const second = generateToken(SECRET, options)

    expect(first.split('.')[1]).not.toBe(second.split('.')[1])
    expect(first).not.toBe(second)
  })
})

describe('verifyToken', () => {
  const verify = (header: string | undefined, now = at('2026-01-01T00:00:00Z'), seen = freshStore()) =>
    verifyToken(SECRET, header, { now, seen })

  const validHeader = (now = at('2026-01-01T00:00:00Z')) =>
    `Bearer ${generateToken(SECRET, { now, random: sequentialRandom() })}`

  it('accepts a token generated from the same secret', () => {
    expect(verify(validHeader())).toEqual({ ok: true })
  })

  it('accepts a token generated 119 seconds ago', () => {
    expect(verify(validHeader(at('2026-01-01T00:00:00Z')), at('2026-01-01T00:01:59Z'))).toEqual({ ok: true })
  })

  it('rejects a token signed with a different secret', () => {
    const header = `Bearer ${generateToken('b'.repeat(64), { now: at('2026-01-01T00:00:00Z'), random: sequentialRandom() })}`

    expect(verify(header)).toEqual({ ok: false, reason: 'INVALID_SIGNATURE' })
  })

  it('rejects a token 121 seconds old', () => {
    expect(verify(validHeader(at('2026-01-01T00:00:00Z')), at('2026-01-01T00:02:01Z'))).toEqual({
      ok: false,
      reason: 'STALE',
    })
  })

  it('rejects a token dated too far in the future', () => {
    expect(verify(validHeader(at('2026-01-01T00:02:01Z')), at('2026-01-01T00:00:00Z'))).toEqual({
      ok: false,
      reason: 'STALE',
    })
  })

  it('rejects the same nonce twice', () => {
    const seen = freshStore()
    const header = validHeader()

    expect(verify(header, at('2026-01-01T00:00:00Z'), seen)).toEqual({ ok: true })
    expect(verify(header, at('2026-01-01T00:00:00Z'), seen)).toEqual({ ok: false, reason: 'REPLAYED' })
  })

  it('does not spend a nonce on a token that fails its signature', () => {
    const seen = freshStore()
    const token = generateToken(SECRET, { now: at('2026-01-01T00:00:00Z'), random: sequentialRandom() })
    const [ts, nonce] = token.split('.')

    expect(verify(`Bearer ${ts}.${nonce}.${'0'.repeat(64)}`, at('2026-01-01T00:00:00Z'), seen)).toEqual({
      ok: false,
      reason: 'INVALID_SIGNATURE',
    })
    expect(verify(`Bearer ${token}`, at('2026-01-01T00:00:00Z'), seen)).toEqual({ ok: true })
  })

  it.each([
    ['missing header', undefined],
    ['empty header', ''],
    ['no scheme', '1767225600.deadbeef.cafe'],
    ['wrong scheme', 'Basic 1767225600.deadbeef.cafe'],
    ['too few segments', 'Bearer 1767225600.deadbeef'],
    ['too many segments', 'Bearer 1767225600.deadbeef.cafe.extra'],
    ['non-numeric timestamp', `Bearer now.${'a'.repeat(32)}.${'b'.repeat(64)}`],
    ['short nonce', `Bearer 1767225600.abc.${'b'.repeat(64)}`],
    ['short signature', `Bearer 1767225600.${'a'.repeat(32)}.beef`],
  ])('rejects a malformed header (%s)', (_case, header) => {
    expect(verify(header)).toEqual({ ok: false, reason: 'MALFORMED' })
  })
})

import { describe, expect, it } from 'vitest'
import { TtlNonceStore } from '../src/auth/nonce-store'

const at = (msFromStart: number) => new Date(Date.UTC(2026, 0, 1) + msFromStart)

describe('TtlNonceStore', () => {
  it('accepts a nonce once and refuses it within the TTL', () => {
    const store = new TtlNonceStore(60_000)

    expect(store.claim('a', at(0))).toBe(true)
    expect(store.claim('a', at(59_999))).toBe(false)
  })

  it('forgets a nonce once its TTL has lapsed', () => {
    const store = new TtlNonceStore(60_000)
    store.claim('a', at(0))

    expect(store.claim('a', at(60_000))).toBe(true)
  })

  it('keeps unrelated nonces apart', () => {
    const store = new TtlNonceStore(60_000)

    expect(store.claim('a', at(0))).toBe(true)
    expect(store.claim('b', at(0))).toBe(true)
    expect(store.claim('b', at(0))).toBe(false)
  })
})

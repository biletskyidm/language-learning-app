import type { NonceStore } from '@contracts'

const FIVE_MINUTES_MS = 5 * 60_000

export class TtlNonceStore implements NonceStore {
  private readonly expiry = new Map<string, number>()

  constructor(private readonly ttlMs = FIVE_MINUTES_MS) {}

  claim(nonce: string, at: Date): boolean {
    const now = at.getTime()
    for (const [seen, expiresAt] of this.expiry) {
      if (expiresAt > now) break
      this.expiry.delete(seen)
    }

    if (this.expiry.has(nonce)) return false
    this.expiry.set(nonce, now + this.ttlMs)
    return true
  }
}

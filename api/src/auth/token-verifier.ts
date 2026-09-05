import { verifyToken, type TokenVerification } from '@contracts'
import type { Clock, TokenVerifier } from '../deps'
import { TtlNonceStore } from './nonce-store'

export class SecretTokenVerifier implements TokenVerifier {
  private readonly seen = new TtlNonceStore()

  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {}

  verify(authorizationHeader: string | undefined): TokenVerification {
    return verifyToken(this.secret, authorizationHeader, { now: this.clock, seen: this.seen })
  }
}

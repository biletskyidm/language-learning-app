import { describe, expect, it } from 'vitest'
import { createClient } from '../src/mongo/client'

describe('mongo client', () => {
  /** Without this the driver stores an absent SRS score as null, which the training schema then rejects on read. */
  it('omits undefined fields instead of writing them as null', () => {
    expect(createClient('mongodb://localhost:27017/test').options.ignoreUndefined).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { withRetry } from '../src/llm/retry'

const failing = (failures: number) => {
  let calls = 0

  return async () => {
    calls += 1
    if (calls <= failures) throw new Error(`attempt ${calls} failed`)

    return calls
  }
}

describe('withRetry', () => {
  it('gives back the result of a call that works first time', async () => {
    await expect(withRetry(failing(0), { attempts: 2 })).resolves.toBe(1)
  })

  it('tries once more after a failure', async () => {
    await expect(withRetry(failing(1), { attempts: 2 })).resolves.toBe(2)
  })

  it('gives up with the last failure once the attempts are used', async () => {
    await expect(withRetry(failing(2), { attempts: 2 })).rejects.toThrow('attempt 2 failed')
  })
})

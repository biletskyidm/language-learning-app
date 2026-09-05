import * as SecureStore from 'expo-secure-store'
import { verifyToken, type NonceStore } from '@contracts'
import { BASE_URL_KEY, SECRET_KEY } from '../credentials'
import { NotConfiguredError, UnauthorizedError, apiGet } from '../client'

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }))
jest.mock('expo-crypto', () => {
  let counter = 0
  return {
    getRandomValues: (bytes: Uint8Array) => {
      counter += 1
      bytes.forEach((_, i) => (bytes[i] = i === 0 ? counter : i))
      return bytes
    },
  }
})

const SECRET = 'a'.repeat(64)

const store = SecureStore as jest.Mocked<typeof SecureStore>
const fetchMock = jest.fn()
global.fetch = fetchMock as unknown as typeof fetch

const schema = { parse: (value: unknown) => value } as never

const respondWith = (status: number, body: unknown = {}) =>
  fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body })

const sentAuthorization = (call: number) =>
  (fetchMock.mock.calls[call]?.[1] as RequestInit).headers as Record<string, string>

const freshStore = (): NonceStore => {
  const used = new Set<string>()
  return { claim: (nonce) => (used.has(nonce) ? false : (used.add(nonce), true)) }
}

describe('apiGet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    store.getItemAsync.mockImplementation(async (key) =>
      ({ [BASE_URL_KEY]: 'http://localhost:8787', [SECRET_KEY]: SECRET })[key] ?? null,
    )
  })

  it('signs the request with a bearer token the API accepts', async () => {
    respondWith(200, { status: 'ok' })

    await apiGet('/health', schema)

    const header = sentAuthorization(0).Authorization
    expect(header).toMatch(/^Bearer \d+\.[0-9a-f]{32}\.[0-9a-f]{64}$/)
    expect(verifyToken(SECRET, header, { now: () => new Date(), seen: freshStore() })).toEqual({ ok: true })
  })

  it('uses a fresh nonce on every request', async () => {
    respondWith(200)

    await apiGet('/health', schema)
    await apiGet('/health', schema)

    const nonce = (call: number) => sentAuthorization(call).Authorization.split('.')[1]
    expect(nonce(0)).not.toBe(nonce(1))
  })

  it('surfaces a rejected token as UnauthorizedError', async () => {
    respondWith(401, { error: { code: 'UNAUTHORIZED', message: 'nope' } })

    await expect(apiGet('/expressions', schema)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('refuses to call the API before setup has run', async () => {
    store.getItemAsync.mockResolvedValue(null)

    await expect(apiGet('/health', schema)).rejects.toBeInstanceOf(NotConfiguredError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

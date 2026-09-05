import * as SecureStore from 'expo-secure-store'
import { BASE_URL_KEY, SECRET_KEY, readCredentials, saveCredentials } from '../credentials'

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }))

const store = SecureStore as jest.Mocked<typeof SecureStore>

const stored = (values: Record<string, string | null>) =>
  store.getItemAsync.mockImplementation(async (key) => values[key] ?? null)

describe('saveCredentials', () => {
  beforeEach(() => jest.resetAllMocks())

  it('writes the trimmed url and secret to secure storage', async () => {
    await saveCredentials({ baseUrl: '  http://192.168.1.10:8787/  ', secret: '  abc123  ' })

    expect(store.setItemAsync).toHaveBeenCalledWith(BASE_URL_KEY, 'http://192.168.1.10:8787')
    expect(store.setItemAsync).toHaveBeenCalledWith(SECRET_KEY, 'abc123')
  })
})

describe('readCredentials', () => {
  beforeEach(() => jest.resetAllMocks())

  it('returns the stored pair', async () => {
    stored({ [BASE_URL_KEY]: 'http://localhost:8787', [SECRET_KEY]: 'abc123' })

    await expect(readCredentials()).resolves.toEqual({
      baseUrl: 'http://localhost:8787',
      secret: 'abc123',
    })
  })

  it('returns null while the secret is missing', async () => {
    stored({ [BASE_URL_KEY]: 'http://localhost:8787' })

    await expect(readCredentials()).resolves.toBeNull()
  })

  it('returns null while the url is missing', async () => {
    stored({ [SECRET_KEY]: 'abc123' })

    await expect(readCredentials()).resolves.toBeNull()
  })
})

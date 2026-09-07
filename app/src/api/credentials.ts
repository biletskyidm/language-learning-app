import * as SecureStore from 'expo-secure-store'

export const BASE_URL_KEY = 'apiBaseUrl'
export const SECRET_KEY = 'apiSecret'

export interface Credentials {
  baseUrl: string
  secret: string
}

const normalizeUrl = (url: string) => url.trim().replace(/\/$/, '')

/** Dev override from a gitignored app/.env.local, so local iteration never needs the setup screen. */
const fromEnv = (): Credentials | null => {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL
  const secret = process.env.EXPO_PUBLIC_API_SECRET
  return baseUrl && secret ? { baseUrl: normalizeUrl(baseUrl), secret } : null
}

export const readCredentials = async (): Promise<Credentials | null> => {
  const override = fromEnv()
  if (override) return override

  const [baseUrl, secret] = await Promise.all([
    SecureStore.getItemAsync(BASE_URL_KEY),
    SecureStore.getItemAsync(SECRET_KEY),
  ])
  if (!baseUrl || !secret) return null
  return { baseUrl: normalizeUrl(baseUrl), secret }
}

export const saveCredentials = async ({ baseUrl, secret }: Credentials): Promise<Credentials> => {
  const saved = { baseUrl: normalizeUrl(baseUrl), secret: secret.trim() }
  await Promise.all([
    SecureStore.setItemAsync(BASE_URL_KEY, saved.baseUrl),
    SecureStore.setItemAsync(SECRET_KEY, saved.secret),
  ])
  return saved
}

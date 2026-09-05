import * as SecureStore from 'expo-secure-store'
import type { ZodType } from 'zod'

export const BASE_URL_KEY = 'apiBaseUrl'

export const getBaseUrl = async (): Promise<string> => {
  const stored = await SecureStore.getItemAsync(BASE_URL_KEY)
  const url = stored ?? process.env.EXPO_PUBLIC_API_URL
  if (!url) throw new Error('No API base URL configured')
  return url.replace(/\/$/, '')
}

export const apiGet = async <T>(path: string, schema: ZodType<T>): Promise<T> => {
  const res = await fetch(`${await getBaseUrl()}${path}`)
  const body: unknown = await res.json()
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`)
  return schema.parse(body)
}

import { useQuery } from '@tanstack/react-query'
import { readCredentials, type Credentials } from './credentials'

export const CREDENTIALS_KEY = ['credentials']

export const useCredentials = () =>
  useQuery<Credentials | null>({ queryKey: CREDENTIALS_KEY, queryFn: readCredentials, retry: false })

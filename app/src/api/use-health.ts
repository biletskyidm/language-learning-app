import { useQuery } from '@tanstack/react-query'
import { healthResponseSchema, type HealthResponse } from '@contracts'
import { apiGet } from './client'

export const useHealth = (enabled = true) =>
  useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => apiGet('/health', healthResponseSchema),
    retry: false,
    enabled,
  })

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  scenarioListResponseSchema,
  scenarioSchema,
  type CreateScenarioInput,
  type ScenarioListResponse,
  type UpdateScenarioInput,
} from '@contracts'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export const SCENARIOS_KEY = 'scenarios'

export const useScenarios = () =>
  useQuery<ScenarioListResponse>({
    queryKey: [SCENARIOS_KEY],
    queryFn: () => apiGet('/scenarios', scenarioListResponseSchema),
  })

export const useCreateScenario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateScenarioInput) => apiPost('/scenarios', input, scenarioSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SCENARIOS_KEY] }),
  })
}

export const useUpdateScenario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...patch }: UpdateScenarioInput & { id: string }) =>
      apiPatch(`/scenarios/${id}`, patch, scenarioSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SCENARIOS_KEY] }),
  })
}

export const useDeleteScenario = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/scenarios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SCENARIOS_KEY] }),
  })
}

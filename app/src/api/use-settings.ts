import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsSchema, type Settings } from '@contracts'
import { apiGet, apiPut } from './client'

export const SETTINGS_KEY = 'settings'

export const useSettings = () =>
  useQuery<Settings>({
    queryKey: [SETTINGS_KEY],
    queryFn: () => apiGet('/settings', settingsSchema),
  })

export const useUpdateSettings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Settings) => apiPut('/settings', settings, settingsSchema),
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: [SETTINGS_KEY] })
      const previous = queryClient.getQueryData<Settings>([SETTINGS_KEY])
      queryClient.setQueryData([SETTINGS_KEY], settings)

      return { previous }
    },
    onError: (_error, _settings, context) => {
      queryClient.setQueryData([SETTINGS_KEY], context?.previous)
    },
    onSuccess: (saved) => queryClient.setQueryData([SETTINGS_KEY], saved),
  })
}

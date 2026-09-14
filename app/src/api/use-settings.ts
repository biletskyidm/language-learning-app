import { useRef } from 'react'
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
  const newest = useRef(0)

  return useMutation({
    mutationKey: [SETTINGS_KEY],
    mutationFn: (settings: Settings) => apiPut('/settings', settings, settingsSchema),
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: [SETTINGS_KEY] })
      const previous = queryClient.getQueryData<Settings>([SETTINGS_KEY])
      queryClient.setQueryData([SETTINGS_KEY], settings)

      return { previous, id: ++newest.current }
    },
    onSuccess: (saved, _settings, context) => {
      if (context.id === newest.current) queryClient.setQueryData([SETTINGS_KEY], saved)
    },
    onError: (_error, _settings, context) => {
      if (context?.id === newest.current) queryClient.setQueryData([SETTINGS_KEY], context.previous)
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: [SETTINGS_KEY] }) === 1) {
        void queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] })
      }
    },
  })
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useNavigationTheme } from '../src/theme/use-navigation-theme'

const queryClient = new QueryClient()

export const unstable_settings = { initialRouteName: 'index' }

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={useNavigationTheme()}>
        <StatusBar style="auto" />
        <Stack />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

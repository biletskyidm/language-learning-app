import { DarkTheme, DefaultTheme } from 'expo-router'
import * as ReactNative from 'react-native'
import { renderHook } from '@testing-library/react-native'
import { useNavigationTheme } from '../use-navigation-theme'

jest.mock('expo-router', () => ({ DarkTheme: { dark: true }, DefaultTheme: { dark: false } }))

const withScheme = (scheme: ReactNative.ColorSchemeName) =>
  jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(scheme)

describe('useNavigationTheme', () => {
  afterEach(() => jest.restoreAllMocks())

  it('uses the dark theme when the system is dark', async () => {
    withScheme('dark')
    expect((await renderHook(() => useNavigationTheme())).result.current).toBe(DarkTheme)
  })

  it.each(['light', 'unspecified'] as const)('uses the light theme for %s', async (scheme) => {
    withScheme(scheme)
    expect((await renderHook(() => useNavigationTheme())).result.current).toBe(DefaultTheme)
  })
})

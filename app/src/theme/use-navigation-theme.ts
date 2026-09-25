import { DarkTheme, DefaultTheme } from 'expo-router'
import { useColorScheme } from 'react-native'

export const useNavigationTheme = () => (useColorScheme() === 'dark' ? DarkTheme : DefaultTheme)

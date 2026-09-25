import { DynamicColorIOS } from 'react-native'

const palettes = {
  light: {
    text: '#000000',
    surface: '#ffffff',
    bubble: '#d5d9e0',
    okSoft: '#e7f4ea',
    onAccent: '#ffffff',
    scrim: 'rgba(0,0,0,0.35)',
    shadow: '#000000',
    ok: '#1a7f37',
    warn: '#e5690b',
    error: '#c0392b',
    muted: '#6b7280',
    border: '#d1d5db',
  },
  dark: {
    text: '#ffffff',
    surface: '#1c1c1e',
    bubble: '#2c2c2e',
    okSoft: '#12301b',
    onAccent: '#ffffff',
    scrim: 'rgba(0,0,0,0.6)',
    shadow: '#000000',
    ok: '#30a14e',
    warn: '#ff8a2a',
    error: '#ff5a4d',
    muted: '#98989f',
    border: '#38383a',
  },
}

type ColorName = keyof typeof palettes.light

export const colors = Object.fromEntries(
  Object.keys(palettes.light).map((name) => [
    name,
    DynamicColorIOS({ light: palettes.light[name as ColorName], dark: palettes.dark[name as ColorName] }),
  ]),
) as Record<ColorName, ReturnType<typeof DynamicColorIOS>>

export const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
}

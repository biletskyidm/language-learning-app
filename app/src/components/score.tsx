import { Text, type StyleProp, type TextStyle } from 'react-native'
import { colors } from '../theme/tokens'

export const scoreColor = (score?: number): string => {
  if (score === undefined) return colors.border
  if (score <= 3) return colors.error
  if (score <= 6) return colors.warn

  return colors.ok
}

type Props = { value?: number; digits?: number; placeholder?: string; style?: StyleProp<TextStyle> }

export const Score = ({ value, digits = 1, placeholder = 'new', style }: Props) => {
  const shown = value === undefined ? undefined : value.toFixed(digits)

  return (
    <Text style={[style, { color: shown === undefined ? colors.muted : scoreColor(Number(shown)) }]}>
      {shown ?? placeholder}
    </Text>
  )
}

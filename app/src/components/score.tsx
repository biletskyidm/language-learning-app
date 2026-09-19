import { Text, type StyleProp, type TextStyle } from 'react-native'
import { colors } from '../theme/tokens'

export const scoreColor = (score?: number): string => {
  if (score === undefined) return colors.border
  if (score <= 3) return colors.error
  if (score <= 6) return colors.warn

  return colors.ok
}

type Props = { value?: number; digits?: number; placeholder?: string; style?: StyleProp<TextStyle> }

export const Score = ({ value, digits = 1, placeholder = 'new', style }: Props) => (
  <Text style={[style, { color: value === undefined ? colors.muted : scoreColor(value) }]}>
    {value === undefined ? placeholder : value.toFixed(digits)}
  </Text>
)

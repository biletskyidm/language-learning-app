import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native'
import { colors } from '../theme/tokens'

export const Text = ({ style, ...props }: TextProps) => <RNText style={[{ color: colors.text }, style]} {...props} />

export const TextInput = ({ style, ...props }: TextInputProps) => (
  <RNTextInput style={[{ color: colors.text }, style]} {...props} />
)

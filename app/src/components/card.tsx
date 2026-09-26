import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from './themed'
import { colors, spacing } from '../theme/tokens'

export const Card = ({ title, children }: { title?: string; children: ReactNode }) => (
  <View style={cardStyles.card}>
    {title ? <Text style={cardStyles.title}>{title}</Text> : null}
    {children}
  </View>
)

export const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.bubble, borderRadius: 14, padding: 14, gap: spacing.sm },
  title: { fontSize: 17, fontWeight: '600' },
})

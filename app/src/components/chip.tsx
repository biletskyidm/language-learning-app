import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, spacing } from '../theme/tokens'

type Props = { label: string; active: boolean; onPress: () => void }

export const Chip = ({ label, active, onPress }: Props) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    style={[styles.chip, active && styles.chipActive]}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  chipActive: { borderColor: colors.ok, backgroundColor: colors.ok },
  chipLabel: { fontSize: 13, color: colors.muted },
  chipLabelActive: { color: '#fff', fontWeight: '600' },
})

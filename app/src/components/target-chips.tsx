import { StyleSheet, Text, View } from 'react-native'
import type { ChatMessage, TrainingTarget } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { litTargets } from './assessment'

type Props = { targets: TrainingTarget[]; messages: ChatMessage[] }

export const TargetChips = ({ targets, messages }: Props) => {
  const lit = litTargets(messages)

  return (
    <View style={styles.chips}>
      {targets.map((target) => {
        const isLit = lit.has(target.expression)

        return (
          <View
            key={target.expressionId}
            accessibilityLabel={`${target.expression}, ${isLit ? 'used correctly' : 'not used yet'}`}
            style={[styles.chip, isLit && styles.chipLit]}
          >
            <Text style={[styles.chipLabel, isLit && styles.chipLabelLit]}>{target.expression}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  chipLit: { borderColor: colors.ok, backgroundColor: colors.ok },
  chipLabel: { fontSize: 13, color: colors.muted },
  chipLabelLit: { color: '#fff', fontWeight: '600' },
})

import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from './themed'
import type { Expression } from '@contracts'
import { colors, spacing } from '../theme/tokens'

type Props = {
  targets: Expression[]
  removable: boolean
  onOpen: (target: Expression) => void
  onRemove: (index: number) => void
  onAdd?: () => void
}

export const PracticeTargetChips = ({ targets, removable, onOpen, onRemove, onAdd }: Props) => (
  <View style={styles.chips}>
    {targets.map((target, index) => (
      <View key={target.id} style={styles.chip}>
        <Pressable onPress={() => onOpen(target)} accessibilityRole="button" style={styles.open}>
          <Text style={styles.label}>{target.expression}</Text>
        </Pressable>
        {removable ? (
          <Pressable
            onPress={() => onRemove(index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${target.expression}`}
            hitSlop={4}
            style={styles.remove}
          >
            <Text style={styles.removeIcon}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    ))}
    {onAdd ? (
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Add expression"
        style={[styles.chip, styles.add]}
      >
        <Text style={styles.addLabel}>＋ Add expression</Text>
      </Pressable>
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: colors.bubble,
  },
  open: { flexShrink: 1, paddingVertical: 8, paddingLeft: spacing.md - 2, paddingRight: 2 },
  label: { fontSize: 14, fontWeight: '500' },
  remove: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  removeIcon: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  add: {
    paddingHorizontal: spacing.md - 2,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.ok,
  },
  addLabel: { color: colors.ok, fontSize: 14, fontWeight: '600' },
})

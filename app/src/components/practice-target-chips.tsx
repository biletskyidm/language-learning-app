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
            style={styles.remove}
          >
            <View style={styles.removeBadge}>
              <Text style={styles.removeIcon}>✕</Text>
            </View>
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
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: colors.bubble,
  },
  open: { flexShrink: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md - 2 },
  label: { fontSize: 15, fontWeight: '500' },
  remove: { width: 44, height: 44, marginLeft: -spacing.sm, alignItems: 'center', justifyContent: 'center' },
  removeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: { color: colors.muted, fontSize: 18, fontWeight: '700' },
  add: {
    paddingHorizontal: spacing.md - 2,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.ok,
  },
  addLabel: { color: colors.ok, fontSize: 15, fontWeight: '600' },
})

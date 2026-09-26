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
            hitSlop={10}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.sm + 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: colors.bubble,
  },
  open: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md - 2 },
  label: { fontSize: 15, fontWeight: '500' },
  remove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -6,
    marginRight: 6,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  add: {
    paddingHorizontal: spacing.md - 2,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.ok,
  },
  addLabel: { color: colors.ok, fontSize: 15, fontWeight: '600' },
})

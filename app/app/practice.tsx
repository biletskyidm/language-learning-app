import { useState } from 'react'
import { Stack, router } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Expression } from '@contracts'
import { pickReason } from '../src/api/pick-reason'
import { useExpressions } from '../src/api/use-expressions'
import { usePickedExpressions } from '../src/api/use-picked-expressions'
import { MAX_TARGETS, useTargetSelection } from '../src/api/use-target-selection'
import { ExpressionPicker } from '../src/components/expression-picker'
import { colors, spacing } from '../src/theme/tokens'

type RowProps = {
  item: Expression
  suggested: boolean
  removable: boolean
  onReplace: () => void
  onRemove: () => void
}

const Row = ({ item, suggested, removable, onReplace, onRemove }: RowProps) => (
  <View style={styles.row}>
    <Pressable style={styles.rowBody} onPress={() => router.push(`/expressions/${item.id}`)}>
      <Text style={styles.expression}>{item.expression}</Text>
      <Text style={styles.meaning}>{item.meaning}</Text>
      {suggested ? <Text style={styles.reason}>{pickReason(item)}</Text> : null}
    </Pressable>
    <View style={styles.actions}>
      <Pressable onPress={onReplace} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.action}>Replace</Text>
      </Pressable>
      {removable ? (
        <Pressable onPress={onRemove} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
)

const Targets = ({ initial }: { initial: Expression[] }) => {
  const vocabulary = useExpressions()
  const { targets, replace, remove, add } = useTargetSelection(initial, vocabulary.data?.items)
  const [picking, setPicking] = useState<number | 'add' | undefined>(undefined)
  const suggested = new Set(initial.map((item) => item.id))

  const select = (expression: Expression) => {
    if (picking === 'add') add(expression)
    else if (picking !== undefined) replace(picking, expression)
  }

  return (
    <>
      {picking !== undefined ? (
        <ExpressionPicker
          title={picking === 'add' ? 'Add an expression' : 'Swap in an expression'}
          excludedIds={targets.map((target) => target.id)}
          onSelect={select}
          onClose={() => setPicking(undefined)}
        />
      ) : null}
      <FlatList
        data={targets}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Row
            item={item}
            suggested={suggested.has(item.id)}
            removable={targets.length > 1}
            onReplace={() => setPicking(index)}
            onRemove={() => remove(index)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {targets.length < MAX_TARGETS ? (
        <Pressable onPress={() => setPicking('add')} accessibilityRole="button" style={styles.add}>
          <Text style={styles.addLabel}>Add an expression</Text>
        </Pressable>
      ) : null}
    </>
  )
}

export default function Practice() {
  const picked = usePickedExpressions()
  const items = picked.data?.items

  const body = () => {
    if (items) {
      return items.length ? <Targets initial={items} /> : <Text style={styles.state}>Nothing to practice right now</Text>
    }
    if (picked.isError) return <Text style={styles.error}>Could not work out what to practice</Text>
    return <ActivityIndicator style={styles.state} />
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'What to practice' }} />
      {body()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowBody: { flex: 1, gap: 2 },
  expression: { fontSize: 16, fontWeight: '600' },
  meaning: { color: colors.muted },
  reason: { color: colors.ok, fontSize: 12 },
  actions: { alignItems: 'flex-end', gap: 4 },
  action: { color: colors.ok, fontSize: 13, fontWeight: '600' },
  remove: { color: colors.error, fontSize: 13, fontWeight: '600' },
  separator: { height: 1, backgroundColor: colors.border },
  add: { paddingVertical: spacing.sm, alignItems: 'center' },
  addLabel: { color: colors.ok, fontSize: 15, fontWeight: '600' },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

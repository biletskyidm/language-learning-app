import { Stack, router } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Expression } from '@contracts'
import { pickReason } from '../src/api/pick-reason'
import { usePickedExpressions } from '../src/api/use-picked-expressions'
import { colors, spacing } from '../src/theme/tokens'

const Row = ({ item }: { item: Expression }) => (
  <Pressable style={styles.row} onPress={() => router.push(`/expressions/${item.id}`)}>
    <Text style={styles.expression}>{item.expression}</Text>
    <Text style={styles.meaning}>{item.meaning}</Text>
    <Text style={styles.reason}>{pickReason(item)}</Text>
  </Pressable>
)

export default function Practice() {
  const picked = usePickedExpressions()

  const empty = () => {
    if (picked.isPending) return <ActivityIndicator style={styles.state} />
    if (picked.isError) return <Text style={styles.error}>Could not work out what to practice</Text>
    return <Text style={styles.state}>Nothing to practice right now</Text>
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'What to practice' }} />
      <FlatList
        data={picked.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Row item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={empty()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  row: { paddingVertical: spacing.sm, gap: 2 },
  expression: { fontSize: 16, fontWeight: '600' },
  meaning: { color: colors.muted },
  reason: { color: colors.ok, fontSize: 12 },
  separator: { height: 1, backgroundColor: colors.border },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

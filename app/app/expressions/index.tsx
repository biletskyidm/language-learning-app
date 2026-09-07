import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { Expression } from '@contracts'
import {
  filtersFromParams,
  filtersToParams,
  isFiltered,
  type ExpressionFilters,
} from '../../src/api/expression-filters'
import { useExpressions } from '../../src/api/use-expressions'
import { ExpressionFilterBar } from '../../src/components/expression-filter-bar'
import { colors, spacing } from '../../src/theme/tokens'

const Row = ({ item }: { item: Expression }) => (
  <Pressable style={styles.row} onPress={() => router.push(`/expressions/${item.id}`)}>
    <Text style={styles.expression}>{item.expression}</Text>
    <Text style={styles.meaning}>{item.meaning}</Text>
    <Text style={styles.meta}>
      {item.type} · {item.frequency} · ×{item.timesPracticed ?? 0}
    </Text>
  </Pressable>
)

export default function Expressions() {
  const filters = filtersFromParams(useLocalSearchParams())
  const setFilters = (next: ExpressionFilters) => router.setParams(filtersToParams(next))
  const expressions = useExpressions(filters)

  const empty = () => {
    if (expressions.isPending) return <ActivityIndicator style={styles.state} />
    if (expressions.isError) return <Text style={styles.error}>Could not load your vocabulary</Text>
    if (filters.search || isFiltered(filters)) return <Text style={styles.state}>Nothing matches those filters</Text>
    return <Text style={styles.state}>No expressions yet</Text>
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Vocabulary' }} />
      <TextInput
        style={styles.search}
        value={filters.search}
        onChangeText={(search) => setFilters({ ...filters, search })}
        placeholder="Search expression or meaning"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <ExpressionFilterBar filters={filters} onChange={setFilters} />
      <FlatList
        data={expressions.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Row item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={empty()}
        keyboardDismissMode="on-drag"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.sm },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
  },
  row: { paddingVertical: spacing.sm, gap: 2 },
  expression: { fontSize: 16, fontWeight: '600' },
  meaning: { color: colors.muted },
  meta: { color: colors.muted, fontSize: 12 },
  separator: { height: 1, backgroundColor: colors.border },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

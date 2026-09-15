import { Stack, router } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Expression } from '@contracts'
import { shortDate } from '../src/api/expression-srs'
import { useProgressList, type ProgressSort } from '../src/api/use-progress-list'
import { Chip } from '../src/components/chip'
import { ScoreBar } from '../src/components/score-bar'
import { colors, spacing } from '../src/theme/tokens'

const SORTS: [ProgressSort, string][] = [
  ['weakest', 'Weakest'],
  ['due', 'Due date'],
  ['practiced', 'Practiced'],
]

const Row = ({ item, now }: { item: Expression; now: Date }) => (
  <Pressable style={styles.row} onPress={() => router.push(`/expressions/${item.id}`)}>
    <View style={styles.heading}>
      <Text style={styles.expression} numberOfLines={1}>
        {item.expression}
      </Text>
      <Text style={styles.score}>{item.score === undefined ? 'new' : item.score.toFixed(1)}</Text>
    </View>
    <ScoreBar score={item.score} />
    <Text style={styles.meta}>
      ×{item.timesPracticed ?? 0} · {item.nextTrainingAt ? `due ${shortDate(item.nextTrainingAt, now)}` : 'not scheduled'}
    </Text>
  </Pressable>
)

export default function Progress() {
  const { sort, setSort, expressions } = useProgressList()
  const now = new Date()

  const empty = () => {
    if (expressions.isPending) return <ActivityIndicator style={styles.state} />
    if (expressions.isError) return <Text style={styles.error}>Could not load your progress</Text>
    return <Text style={styles.state}>No expressions yet</Text>
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Progress' }} />
      <View style={styles.segments}>
        {SORTS.map(([value, label]) => (
          <Chip key={value} label={label} active={sort === value} onPress={() => setSort(value)} />
        ))}
      </View>
      <FlatList
        data={expressions.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Row item={item} now={now} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={empty()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.sm },
  segments: { flexDirection: 'row', gap: spacing.sm },
  row: { paddingVertical: spacing.sm, gap: 6 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  expression: { flex: 1, fontSize: 16, fontWeight: '600' },
  score: { color: colors.muted, fontVariant: ['tabular-nums'] },
  meta: { color: colors.muted, fontSize: 12 },
  separator: { height: 1, backgroundColor: colors.border },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

import { router } from 'expo-router'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useExpressionHistory } from '../api/use-expression-history'
import { colors, spacing } from '../theme/tokens'
import { TRAINING_TYPE_NAMES } from './training-row'

const score = (value?: number) => (value === undefined ? 'new' : value.toFixed(1))

export const ExpressionHistory = ({ id }: { id: string }) => {
  const history = useExpressionHistory(id)

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>History</Text>
      {history.isPending ? <ActivityIndicator /> : null}
      {history.isError ? <Text style={styles.error}>Could not load the history</Text> : null}
      {history.data?.items.length === 0 ? <Text style={styles.empty}>No practice recorded yet.</Text> : null}
      {history.data?.items.map((item) => (
        <Pressable
          key={`${item.trainingId}-${item.at.toISOString()}`}
          style={styles.row}
          accessibilityRole="button"
          onPress={() => router.push(`/trainings/history/${item.trainingId}`)}
        >
          <Text style={styles.type}>{TRAINING_TYPE_NAMES[item.type]}</Text>
          <Text style={styles.meta}>
            {item.at.toLocaleDateString()} · scored {item.scoreWritten} · {score(item.before.score)} →{' '}
            {score(item.after.score)}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, paddingTop: spacing.md },
  heading: { fontWeight: '600' },
  row: { gap: 2 },
  type: { fontWeight: '500' },
  meta: { color: colors.muted, fontSize: 12 },
  empty: { color: colors.muted },
  error: { color: colors.error },
})

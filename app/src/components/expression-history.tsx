import { router } from 'expo-router'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useExpressionHistory } from '../api/use-expression-history'
import { colors, spacing } from '../theme/tokens'
import { Score } from './score'
import { trainingRoute } from './training-route'
import { TRAINING_TYPE_NAMES } from './training-row'

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
          onPress={() => {
            const route = trainingRoute(item.type, item.trainingId, item.status)
            if (route) router.push(route)
          }}
        >
          <Text style={styles.type}>
            {TRAINING_TYPE_NAMES[item.type]}
            {item.status === 'ACTIVE' ? <Text style={styles.active}> · still open</Text> : null}
          </Text>
          <Text style={styles.meta}>
            {item.at.toLocaleDateString()} · scored{' '}
            <Score value={item.scoreWritten} digits={0} style={styles.meta} /> ·{' '}
            <Score value={item.before.score} style={styles.meta} /> →{' '}
            <Score value={item.after.score} style={styles.meta} />
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
  active: { color: colors.ok, fontWeight: '600' },
  empty: { color: colors.muted },
  error: { color: colors.error },
})

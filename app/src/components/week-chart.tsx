import { StyleSheet, View } from 'react-native'
import { Text } from './themed'
import { colors, spacing } from '../theme/tokens'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BAR_HEIGHT = 120

export const WeekChart = ({ week, today }: { week: number[]; today: number }) => {
  const max = Math.max(1, ...week)

  return (
    <View style={styles.chart}>
      <Text style={styles.heading}>Expressions trained this week</Text>
      <View style={styles.columns}>
        {week.map((count, day) => (
          <View key={DAYS[day]} style={styles.column} accessibilityLabel={`${DAYS[day]}: ${count}`}>
            <View style={styles.plot}>
              <Text style={styles.count}>{count}</Text>
              <View
                style={[styles.bar, { height: Math.max(2, (count / max) * BAR_HEIGHT) }, day === today && styles.today]}
              />
            </View>
            <Text style={[styles.day, day === today && styles.todayLabel]}>{DAYS[day]}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  chart: { alignSelf: 'stretch', gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: '600' },
  columns: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  plot: { height: BAR_HEIGHT + 20, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  count: { color: colors.muted, fontSize: 12 },
  bar: { alignSelf: 'stretch', borderRadius: 4, backgroundColor: colors.border },
  today: { backgroundColor: colors.ok },
  day: { color: colors.muted, fontSize: 12 },
  todayLabel: { color: colors.ok, fontWeight: '600' },
})

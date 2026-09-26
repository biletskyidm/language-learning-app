import { StyleSheet, View } from 'react-native'
import { Text } from './themed'
import { Skeleton } from './skeleton'
import { colors, spacing } from '../theme/tokens'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BAR_HEIGHT = 120
const PLACEHOLDER_HEIGHTS = [40, 70, 30, 90, 55, 25, 60]

export const WeekChart = ({ week, today }: { week?: number[]; today: number }) => {
  const max = Math.max(1, ...(week ?? []))

  return (
    <View style={styles.chart}>
      <Text style={styles.heading}>Expressions trained this week</Text>
      <View style={styles.columns}>
        {DAYS.map((label, day) => (
          <View key={label} style={styles.column} accessibilityLabel={week && `${label}: ${week[day]}`}>
            <View style={styles.plot}>
              {week ? (
                <>
                  <Text style={styles.count}>{week[day]}</Text>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(2, (week[day] / max) * BAR_HEIGHT) },
                      day === today && styles.today,
                    ]}
                  />
                </>
              ) : (
                <Skeleton height={PLACEHOLDER_HEIGHTS[day]} style={styles.placeholder} />
              )}
            </View>
            <Text style={[styles.day, day === today && styles.todayLabel]}>{label}</Text>
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
  placeholder: { alignSelf: 'stretch' },
  day: { color: colors.muted, fontSize: 12 },
  todayLabel: { color: colors.ok, fontWeight: '600' },
})

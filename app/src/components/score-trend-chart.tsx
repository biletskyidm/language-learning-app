import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from './themed'
import { Score } from './score'
import { colors } from '../theme/tokens'

const HEIGHT = 120
const DAY = 24 * 60 * 60 * 1000

const dayLabel = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * DAY).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const ScoreTrendChart = ({ trend }: { trend: (number | null)[] }) => {
  const [width, setWidth] = useState(0)
  const last = trend.length - 1
  const points = trend.flatMap((value, day) =>
    value === null ? [] : [{ day, value, x: (day / last) * width, y: (1 - value / 10) * HEIGHT }],
  )
  const first = points[0]
  const latest = points.at(-1)

  return (
    <View style={styles.chart}>
      {first && latest ? (
        <Text style={styles.small}>
          <Score value={latest.value} style={styles.headline} />
          {points.length >= 2
            ? `  ${latest.value >= first.value ? '▲' : '▼'} ${Math.abs(latest.value - first.value).toFixed(1)} since ${dayLabel(last - first.day)}`
            : ''}
        </Text>
      ) : (
        <Text style={styles.small}>No practice in the last 30 days</Text>
      )}
      <View style={styles.plotRow}>
        <View style={styles.axis}>
          {['10', '5', '0'].map((label) => (
            <Text key={label} style={styles.small}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.plot} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {[0, 0.5, 1].map((fraction) => (
            <View key={fraction} style={[styles.grid, { top: fraction * HEIGHT }]} />
          ))}
          {points.slice(1).map((to, index) => {
            const from = points[index]!
            const length = Math.hypot(to.x - from.x, to.y - from.y)

            return (
              <View
                key={to.day}
                style={[
                  styles.segment,
                  {
                    width: length,
                    left: (from.x + to.x) / 2 - length / 2,
                    top: (from.y + to.y) / 2 - 1,
                    transform: [{ rotate: `${Math.atan2(to.y - from.y, to.x - from.x)}rad` }],
                  },
                ]}
              />
            )
          })}
          {points.map(({ day, x, y }) => (
            <View key={day} style={[styles.point, { left: x - 2, top: y - 2 }]} />
          ))}
        </View>
      </View>
      <View style={styles.xAxis}>
        <Text style={styles.small}>30 days ago</Text>
        <Text style={styles.small}>Today</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  chart: { gap: 4 },
  small: { color: colors.muted, fontSize: 12 },
  headline: { fontSize: 22, fontWeight: '700' },
  plotRow: { flexDirection: 'row', gap: 6 },
  axis: { width: 20, height: HEIGHT, justifyContent: 'space-between', marginVertical: -7 },
  plot: { flex: 1, height: HEIGHT },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  segment: { position: 'absolute', height: 2, borderRadius: 1, backgroundColor: colors.ok },
  point: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ok },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 26 },
})

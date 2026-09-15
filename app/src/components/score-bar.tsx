import { StyleSheet, View } from 'react-native'
import { colors } from '../theme/tokens'

export const scoreBarWidth = (score?: number): `${number}%` =>
  `${Math.min(10, Math.max(0, score ?? 0)) * 10}%`

export const ScoreBar = ({ score }: { score?: number }) => (
  <View
    style={styles.track}
    accessibilityLabel={score === undefined ? 'Not practiced yet' : `Score ${score.toFixed(1)} of 10`}
  >
    <View style={[styles.fill, { width: scoreBarWidth(score) }]} />
  </View>
)

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.ok },
})

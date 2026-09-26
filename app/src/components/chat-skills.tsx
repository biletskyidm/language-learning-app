import { StyleSheet, View } from 'react-native'
import type { FinalAssessmentAverages } from '@contracts'
import { Text } from './themed'
import { AVERAGE_LABELS } from './averages-line'
import { Score } from './score'
import { ScoreBar } from './score-bar'
import { spacing } from '../theme/tokens'

export const ChatSkills = ({ averages }: { averages: FinalAssessmentAverages }) => (
  <View style={styles.rows}>
    {AVERAGE_LABELS.map(([key, label]) => (
      <View key={key} style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.bar}>
          <ScoreBar score={averages[key]} />
        </View>
        <Score value={averages[key]} style={styles.score} />
      </View>
    ))}
  </View>
)

const styles = StyleSheet.create({
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 90, fontSize: 13 },
  bar: { flex: 1 },
  score: { width: 30, textAlign: 'right', fontSize: 13, fontWeight: '600' },
})

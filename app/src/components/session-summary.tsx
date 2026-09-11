import { StyleSheet, Text, View } from 'react-native'
import type { FinalAssessment, Narrative } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { averagesLine } from './assessment'

const NARRATIVE_LABELS: [keyof Narrative, string][] = [
  ['strengths', 'Strengths'],
  ['areasForImprovement', 'To work on'],
  ['suggestedFocus', 'Focus next'],
]

export const SessionSummary = ({ finalAssessment }: { finalAssessment: FinalAssessment }) => (
  <View style={styles.summary}>
    <Text style={styles.averages}>{averagesLine(finalAssessment.averages)}</Text>
    {NARRATIVE_LABELS.map(([key, label]) => (
      <View key={key} style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.text}>{finalAssessment.narrative[key]}</Text>
      </View>
    ))}
  </View>
)

const styles = StyleSheet.create({
  summary: {
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  averages: { fontSize: 13, fontWeight: '600' },
  field: { gap: 2 },
  label: { fontSize: 12, color: colors.muted, textTransform: 'uppercase' },
  text: { fontSize: 14 },
})

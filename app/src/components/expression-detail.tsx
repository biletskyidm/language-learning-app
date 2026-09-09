import { StyleSheet, Text, View } from 'react-native'
import type { Expression } from '@contracts'
import { relativeDays } from '../api/expression-srs'
import { colors, spacing } from '../theme/tokens'

const trained = (times = 0) => `Trained ${times} ${times === 1 ? 'time' : 'times'}`

const Field = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
)

export const ExpressionDetail = ({ expression }: { expression: Expression }) => {
  const now = new Date()
  const due = expression.nextTrainingAt

  return (
    <View style={styles.container}>
      <Text style={styles.expression}>{expression.expression}</Text>
      <Text style={styles.meta}>
        {[expression.type, expression.partOfSpeech, expression.frequency].filter(Boolean).join(' · ')}
      </Text>
      <Text style={styles.meaning}>{expression.meaning}</Text>

      {expression.examples.length ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Examples</Text>
          {expression.examples.map((example) => (
            <Text key={example} style={styles.example}>
              · {example}
            </Text>
          ))}
        </View>
      ) : null}

      {expression.tags.length ? (
        <View style={styles.tags}>
          {expression.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.counter}>{trained(expression.timesPracticed)}</Text>
        <Field label="Score" value={expression.score === undefined ? '—' : expression.score.toFixed(1)} />
        <Field
          label="Last practiced"
          value={expression.lastTimePracticedAt ? relativeDays(expression.lastTimePracticedAt, now) : '—'}
        />
        <Field
          label="Next due"
          value={due ? (due <= now ? 'due now' : relativeDays(due, now)) : '—'}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  expression: { fontSize: 24, fontWeight: '700' },
  meta: { color: colors.muted },
  meaning: { fontSize: 16 },
  section: { gap: 4, paddingTop: spacing.sm },
  heading: { fontWeight: '600' },
  example: { color: colors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: 12,
  },
  counter: { fontSize: 18, fontWeight: '700' },
  field: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.muted },
  value: { fontWeight: '500' },
})

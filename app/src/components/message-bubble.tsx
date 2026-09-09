import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Assessment, AssessmentCategory, ChatMessage } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { badgeTone, overallScore } from './assessment'

const CATEGORIES: { label: string; key: keyof Omit<Assessment, 'targetExpressionCorrectness'> }[] = [
  { label: 'Grammar', key: 'grammar' },
  { label: 'Vocabulary', key: 'vocabularyDiversity' },
  { label: 'Complexity', key: 'sentenceComplexity' },
  { label: 'Naturalness', key: 'sentenceNaturalness' },
]

const toneColor = { good: colors.ok, fair: colors.warn, poor: colors.error } as const

const Row = ({ label, category }: { label: string; category: AssessmentCategory }) => (
  <View style={styles.row}>
    <View style={styles.rowHead}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowScore, { color: toneColor[badgeTone(category.score)] }]}>
        {category.score.toFixed(1)}
      </Text>
    </View>
    {category.messageWithSuggestions ? (
      <Text style={styles.suggestion}>{category.messageWithSuggestions}</Text>
    ) : null}
  </View>
)

const Breakdown = ({ assessment }: { assessment: Assessment }) => {
  const targets = Object.entries(assessment.targetExpressionCorrectness)

  return (
    <View style={styles.panel}>
      {CATEGORIES.map(({ label, key }) => (
        <Row key={key} label={label} category={assessment[key]} />
      ))}
      {targets.length ? (
        <View style={styles.targets}>
          <Text style={styles.heading}>Targets</Text>
          {targets.map(([expression, target]) => (
            <Row key={expression} label={expression} category={target} />
          ))}
          {targets.map(([expression, target]) =>
            target.correctVersion ? (
              <Text key={`${expression}-correct`} style={styles.correct}>
                {target.correctVersion}
              </Text>
            ) : null,
          )}
        </View>
      ) : null}
    </View>
  )
}

export const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const [expanded, setExpanded] = useState(false)
  const assessment = message.role === 'user' ? message.assessment : undefined
  const score = assessment ? overallScore(assessment) : 0

  return (
    <View style={message.role === 'user' ? styles.mine : styles.theirs}>
      <View style={[styles.bubble, message.role === 'user' ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={styles.bubbleText}>{message.content}</Text>
      </View>
      {assessment ? (
        <>
          <Pressable
            testID="assessment-badge"
            onPress={() => setExpanded((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`Assessment ${score.toFixed(1)} out of 10`}
            accessibilityState={{ expanded }}
            style={[styles.badge, { borderColor: toneColor[badgeTone(score)] }]}
          >
            <Text style={[styles.badgeLabel, { color: toneColor[badgeTone(score)] }]}>
              {score.toFixed(1)}
            </Text>
          </Pressable>
          {expanded ? <Breakdown assessment={assessment} /> : null}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '85%', gap: 4 },
  theirs: { alignSelf: 'flex-start', maxWidth: '85%' },
  bubble: { borderRadius: 16, padding: spacing.sm + 2 },
  bubbleTheirs: { backgroundColor: '#eef0f3' },
  bubbleMine: { backgroundColor: colors.ok },
  bubbleText: { fontSize: 15 },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeLabel: { fontSize: 12, fontWeight: '700' },
  panel: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
  },
  row: { gap: 2 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowLabel: { flexShrink: 1, fontWeight: '600', fontSize: 13 },
  rowScore: { fontWeight: '700', fontSize: 13 },
  suggestion: { color: colors.muted, fontSize: 13 },
  targets: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  heading: { fontWeight: '700', fontSize: 13 },
  correct: { fontSize: 13 },
})

import { useState } from 'react'
import { LayoutAnimation, Modal, Pressable, StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'
import type { Assessment, AssessmentCategory } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { overallScore } from './assessment'
import { Score } from './score'
import { FadeScroll, scoreboard, ScoreLine } from './scoreboard'
import { Text } from './themed'

const CATEGORIES: { label: string; key: keyof Omit<Assessment, 'targetPhrasesCorrectness' | 'overallFeedback'> }[] = [
  { label: 'Context', key: 'contextCorrectness' },
  { label: 'Grammar', key: 'grammarAndSyntax' },
  { label: 'Vocabulary', key: 'vocabularyDiversity' },
  { label: 'Complexity', key: 'sentenceComplexity' },
  { label: 'Naturalness', key: 'sentenceNaturalness' },
]

type RowProps = {
  label: string
  category: AssessmentCategory
  correctVersion?: string
  open: boolean
  onToggle: () => void
}

const Row = ({ label, category, correctVersion, open, onToggle }: RowProps) => (
  <View style={scoreboard.row}>
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${category.score.toFixed(0)} of 10`}
      accessibilityState={{ expanded: open }}
    >
      <ScoreLine label={label} score={category.score} open={open} />
    </Pressable>
    {open ? (
      <View style={styles.detail}>
        {category.feedback ? <Text style={scoreboard.text}>{category.feedback}</Text> : null}
        {category.suggestions ? (
          <Text style={styles.suggestion}>
            <Text style={styles.accent}>Try: </Text>
            {category.suggestions}
          </Text>
        ) : null}
        {correctVersion ? <Text style={scoreboard.text}>✓ {correctVersion}</Text> : null}
      </View>
    ) : null}
  </View>
)

type Props = { assessment: Assessment; onDismiss: () => void }

export const AssessmentPreview = ({ assessment, onDismiss }: Props) => {
  const [open, setOpen] = useState<string | null>(null)
  const targets = Object.entries(assessment.targetPhrasesCorrectness)
  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen((current) => (current === key ? null : key))
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      <BlurView intensity={40} tint="systemUltraThinMaterial" style={StyleSheet.absoluteFill} />
      <Pressable
        style={[StyleSheet.absoluteFill, styles.dim]}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss assessment"
      />
      <View pointerEvents="box-none" style={styles.center}>
        <View style={[scoreboard.card, styles.card]}>
          <FadeScroll>
            <Pressable
              onPress={() => toggle('strengths')}
              style={scoreboard.hero}
              accessibilityRole="button"
              accessibilityState={{ expanded: open === 'strengths' }}
            >
              <Score value={overallScore(assessment)} style={scoreboard.heroScore} />
              <Text style={styles.strengths} numberOfLines={open === 'strengths' ? undefined : 3}>
                {assessment.overallFeedback.strengths}
              </Text>
            </Pressable>
            {CATEGORIES.map(({ label, key }) => (
              <Row
                key={key}
                label={label}
                category={assessment[key]}
                open={open === key}
                onToggle={() => toggle(key)}
              />
            ))}
            {targets.length ? <Text style={scoreboard.section}>Targets</Text> : null}
            {targets.map(([expression, target]) => (
              <Row
                key={expression}
                label={expression}
                category={target}
                correctVersion={target.correctVersion}
                open={open === `target:${expression}`}
                onToggle={() => toggle(`target:${expression}`)}
              />
            ))}
            <View style={styles.improve}>
              <Text style={scoreboard.section}>To improve</Text>
              <Text style={scoreboard.text}>{assessment.overallFeedback.areasForImprovement}</Text>
            </View>
          </FadeScroll>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.12)' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
  card: { maxHeight: '80%' },
  strengths: { flex: 1, fontSize: 12, lineHeight: 16, color: colors.muted },
  detail: { gap: 6, paddingBottom: 12 },
  suggestion: { fontSize: 13, lineHeight: 18, color: colors.muted },
  accent: { fontSize: 12, fontWeight: '700', color: colors.ok },
  improve: { gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
})

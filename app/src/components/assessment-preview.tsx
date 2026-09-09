import { useEffect, useRef } from 'react'
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Assessment, AssessmentCategory } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { badgeTone } from './assessment'

const CATEGORIES: { label: string; key: keyof Omit<Assessment, 'targetExpressionCorrectness'> }[] = [
  { label: 'Grammar', key: 'grammar' },
  { label: 'Vocabulary', key: 'vocabularyDiversity' },
  { label: 'Complexity', key: 'sentenceComplexity' },
  { label: 'Naturalness', key: 'sentenceNaturalness' },
]

export const toneColor = { good: colors.ok, fair: colors.warn, poor: colors.error } as const

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

type Props = { assessment: Assessment; onDismiss: () => void }

export const AssessmentPreview = ({ assessment, onDismiss }: Props) => {
  const pop = useRef(new Animated.Value(0)).current
  const targets = Object.entries(assessment.targetExpressionCorrectness)

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start()
  }, [pop])

  return (
    <Pressable
      style={styles.backdrop}
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel="Dismiss assessment"
    >
      <Animated.View
        onStartShouldSetResponder={() => true}
        style={[
          styles.card,
          { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
        ]}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          {CATEGORIES.map(({ label, key }) => (
            <Row key={key} label={label} category={assessment[key]} />
          ))}
          {targets.length ? (
            <View style={styles.targets}>
              <Text style={styles.heading}>Targets</Text>
              {targets.map(([expression, target]) => (
                <View key={expression} style={styles.row}>
                  <Row label={expression} category={target} />
                  {target.correctVersion ? (
                    <Text style={styles.correct}>{target.correctVersion}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  card: {
    maxHeight: '92%',
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  scroll: { flexShrink: 1 },
  body: { gap: spacing.md, padding: spacing.md },
  row: { gap: 2 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowLabel: { flexShrink: 1, fontWeight: '600', fontSize: 15 },
  rowScore: { fontWeight: '700', fontSize: 15 },
  suggestion: { color: colors.muted, fontSize: 14 },
  targets: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  heading: { fontWeight: '700', fontSize: 15 },
  correct: { fontSize: 14, paddingTop: 2 },
})

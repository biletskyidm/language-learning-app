import { useRef, useState, type ReactNode } from 'react'
import { Animated, LayoutAnimation, Modal, Pressable, StyleSheet, useColorScheme, View } from 'react-native'
import { BlurView } from 'expo-blur'
import type { Assessment, AssessmentCategory } from '@contracts'
import { colors, palettes, spacing } from '../theme/tokens'
import { overallScore } from './assessment'
import { Score } from './score'
import { ScoreBar } from './score-bar'
import { Text } from './themed'

const CATEGORIES: { label: string; key: keyof Omit<Assessment, 'targetPhrasesCorrectness' | 'overallFeedback'> }[] = [
  { label: 'Context', key: 'contextCorrectness' },
  { label: 'Grammar', key: 'grammarAndSyntax' },
  { label: 'Vocabulary', key: 'vocabularyDiversity' },
  { label: 'Complexity', key: 'sentenceComplexity' },
  { label: 'Naturalness', key: 'sentenceNaturalness' },
]

const FADE = 40

const FadeScroll = ({ children }: { children: ReactNode }) => {
  const surface = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'].surface
  const y = useRef(new Animated.Value(0)).current
  const [size, setSize] = useState({ view: 0, content: 0 })
  const max = Math.max(0, size.content - size.view)

  return (
    <View style={styles.fadeWrap}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
        onLayout={(event) => setSize((current) => ({ ...current, view: event.nativeEvent.layout.height }))}
        onContentSizeChange={(_, content) => setSize((current) => ({ ...current, content }))}
      >
        {children}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fade,
          {
            top: 0,
            experimental_backgroundImage: `linear-gradient(to bottom, ${surface}, ${surface}00)`,
            opacity: y.interpolate({ inputRange: [0, FADE], outputRange: [0, 1], extrapolate: 'clamp' }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fade,
          {
            bottom: 0,
            experimental_backgroundImage: `linear-gradient(to top, ${surface}, ${surface}00)`,
            opacity:
              max === 0
                ? 0
                : y.interpolate({ inputRange: [max - FADE, max], outputRange: [1, 0], extrapolate: 'clamp' }),
          },
        ]}
      />
    </View>
  )
}

type RowProps = {
  label: string
  category: AssessmentCategory
  correctVersion?: string
  open: boolean
  onToggle: () => void
}

const Row = ({ label, category, correctVersion, open, onToggle }: RowProps) => (
  <View style={styles.row}>
    <Pressable
      onPress={onToggle}
      style={styles.rowHead}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${category.score.toFixed(0)} of 10`}
      accessibilityState={{ expanded: open }}
    >
      <Text style={styles.rowLabel} numberOfLines={2}>
        {label}
      </Text>
      <View style={styles.bar}>
        <ScoreBar score={category.score} />
      </View>
      <Score value={category.score} digits={0} style={styles.rowScore} />
      <Text style={styles.toggle}>{open ? '−' : '+'}</Text>
    </Pressable>
    {open ? (
      <View style={styles.detail}>
        {category.feedback ? <Text style={styles.feedback}>{category.feedback}</Text> : null}
        {category.suggestions ? (
          <Text style={styles.suggestion}>
            <Text style={styles.accent}>Try: </Text>
            {category.suggestions}
          </Text>
        ) : null}
        {correctVersion ? <Text style={styles.feedback}>✓ {correctVersion}</Text> : null}
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
        <View style={styles.card}>
          <Pressable
            onPress={() => toggle('strengths')}
            style={styles.hero}
            accessibilityRole="button"
            accessibilityState={{ expanded: open === 'strengths' }}
          >
            <Score value={overallScore(assessment)} style={styles.heroScore} />
            <Text style={styles.strengths} numberOfLines={open === 'strengths' ? undefined : 3}>
              {assessment.overallFeedback.strengths}
            </Text>
          </Pressable>
          <FadeScroll>
            {CATEGORIES.map(({ label, key }) => (
              <Row
                key={key}
                label={label}
                category={assessment[key]}
                open={open === key}
                onToggle={() => toggle(key)}
              />
            ))}
            {targets.length ? <Text style={styles.section}>Targets</Text> : null}
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
              <Pressable
                onPress={() => toggle('improve')}
                accessibilityRole="button"
                accessibilityLabel="To improve"
                accessibilityState={{ expanded: open === 'improve' }}
              >
                <Text style={styles.accent}>To improve {open === 'improve' ? '−' : '+'}</Text>
              </Pressable>
              {open === 'improve' ? (
                <Text style={styles.feedback}>{assessment.overallFeedback.areasForImprovement}</Text>
              ) : null}
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
  card: {
    maxHeight: '80%',
    borderRadius: 20,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, paddingBottom: 12 },
  heroScore: { fontSize: 34, fontWeight: '800' },
  strengths: { flex: 1, fontSize: 12, lineHeight: 16, color: colors.muted },
  fadeWrap: { flexShrink: 1 },
  scroll: { flexGrow: 0 },
  body: { paddingHorizontal: spacing.md, paddingBottom: 12 },
  fade: { position: 'absolute', left: 0, right: 0, height: FADE },
  section: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', paddingTop: 12, paddingBottom: 2 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  rowLabel: { width: 120, fontSize: 14, fontWeight: '600' },
  bar: { flex: 1 },
  rowScore: { width: 22, textAlign: 'right', fontSize: 14, fontWeight: '800' },
  toggle: { width: 14, textAlign: 'center', fontSize: 16, color: colors.muted },
  detail: { gap: 6, paddingBottom: 12 },
  feedback: { fontSize: 13, lineHeight: 18 },
  suggestion: { fontSize: 13, lineHeight: 18, color: colors.muted },
  accent: { fontSize: 12, fontWeight: '700', color: colors.ok },
  improve: { gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12 },
})

import { StyleSheet, View } from 'react-native'
import { Text } from './themed'
import type { FinalAssessment, Narrative } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { AVERAGE_LABELS } from './averages-line'
import { Score } from './score'
import { FadeScroll, scoreboard, ScoreLine } from './scoreboard'

const NARRATIVE_LABELS: [keyof Narrative, string][] = [
  ['strengths', 'Strengths'],
  ['areasForImprovement', 'To work on'],
  ['suggestedFocus', 'Focus next'],
]

type Props = { finalAssessment: FinalAssessment; capped?: boolean }

export const SessionSummary = ({ finalAssessment, capped }: Props) => {
  const { averages, targets, narrative } = finalAssessment
  const entries = Object.entries(targets)
  const overall = AVERAGE_LABELS.reduce((sum, [key]) => sum + averages[key], 0) / AVERAGE_LABELS.length
  const content = (
    <>
      <View style={scoreboard.hero}>
        <Score value={overall} style={scoreboard.heroScore} />
      </View>
      {AVERAGE_LABELS.map(([key, label]) => (
        <View key={key} style={scoreboard.row}>
          <ScoreLine label={label} score={averages[key]} />
        </View>
      ))}
      {entries.length ? <Text style={scoreboard.section}>Targets</Text> : null}
      {entries.map(([expression, target]) => (
        <View key={expression} style={scoreboard.row}>
          <ScoreLine label={expression} score={target.score} />
        </View>
      ))}
      {NARRATIVE_LABELS.map(([key, label]) => (
        <View key={key} style={styles.section}>
          <Text style={scoreboard.section}>{label}</Text>
          <Text style={scoreboard.text}>{narrative[key]}</Text>
        </View>
      ))}
    </>
  )

  return capped ? (
    <View style={[scoreboard.card, styles.capped]}>
      <FadeScroll>{content}</FadeScroll>
    </View>
  ) : (
    <View style={[scoreboard.card, scoreboard.body]}>{content}</View>
  )
}

const styles = StyleSheet.create({
  capped: { maxHeight: '50%', flexShrink: 1, marginHorizontal: spacing.md, marginVertical: spacing.sm },
  section: { gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
})

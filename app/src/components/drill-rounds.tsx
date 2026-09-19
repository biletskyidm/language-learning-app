import { StyleSheet, Text, View } from 'react-native'
import type {
  DescribeRound,
  DescribeTraining,
  GapsRound,
  GapsTraining,
  SmuggleRound,
  SmuggleTraining,
} from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { roundVerdictLine } from './drill-history'
import { Score, scoreColorAt } from './score'

export type DrillTraining = GapsTraining | DescribeTraining | SmuggleTraining

const BLANK = '______'

const GapsPast = ({ round }: { round: GapsRound }) => (
  <Text style={styles.story}>
    {round.material.parts.map((part, blank) => {
      const judged = round.verdict?.perBlank[blank]

      return (
        <Text key={blank}>
          {part}
          {blank < round.material.parts.length - 1 ? (
            <Text>
              <Text style={[styles.blank, judged && (judged.correct ? styles.right : styles.wrong)]}>
                {judged?.given || round.answer?.fills[blank] || BLANK}
              </Text>
              {judged && !judged.correct ? <Text style={styles.right}> {judged.expected}</Text> : null}
            </Text>
          ) : null}
        </Text>
      )
    })}
  </Text>
)

const DescribePast = ({ round }: { round: DescribeRound }) => (
  <>
    <Text style={styles.prompt}>Explain without its words</Text>
    <Text style={styles.expression}>{round.material.expression}</Text>
    {round.answer ? <Text style={styles.answer}>{round.answer.description}</Text> : null}
    {round.verdict ? <Text style={styles.note}>{round.verdict.feedback}</Text> : null}
  </>
)

const SmugglePast = ({ round }: { round: SmuggleRound }) => (
  <>
    <View style={styles.chips}>
      {round.material.targets.map((target) => {
        const result = round.verdict?.results.find(({ expression }) => expression === target.expression)

        return (
          <Text
            key={target.expressionId}
            style={[
              styles.chip,
              result && { borderColor: scoreColorAt(result.score, 0), color: scoreColorAt(result.score, 0) },
            ]}
          >
            {target.expression}
            {result ? <> <Score value={result.score} digits={0} /></> : ''}
          </Text>
        )
      })}
    </View>
    {round.answer ? <Text style={styles.answer}>{round.answer.message}</Text> : null}
    {round.verdict?.results.map((result) => (
      <Text key={result.expression} style={styles.note}>
        {result.expression}: {result.note}
      </Text>
    ))}
    {round.verdict ? <Text style={styles.reply}>{round.verdict.reply}</Text> : null}
  </>
)

const drawn = (training: DrillTraining) => {
  if (training.type === 'gaps') {
    return training.rounds.map((round) => ({
      index: round.index,
      body: <GapsPast round={round} />,
      line: roundVerdictLine({ type: 'gaps', round }),
    }))
  }
  if (training.type === 'describe') {
    return training.rounds.map((round) => ({
      index: round.index,
      body: <DescribePast round={round} />,
      line: roundVerdictLine({ type: 'describe', round }),
    }))
  }

  return training.rounds.map((round) => ({
    index: round.index,
    body: <SmugglePast round={round} />,
    line: roundVerdictLine({ type: 'smuggle', round }),
  }))
}

/** Every round of a finished drill, read-only, drawn the way its own type reads best. */
export const DrillRounds = ({ training }: { training: DrillTraining }) => {
  const rounds = drawn(training)

  return (
    <View style={styles.rounds}>
      {rounds.length === 0 ? <Text style={styles.empty}>No rounds were played.</Text> : null}
      {rounds.map(({ index, body, line }) => (
        <View key={index} style={styles.round}>
          <Text style={styles.heading}>Round {index + 1}</Text>
          {body}
          <Text style={styles.verdict}>{line ?? 'Never answered'}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  rounds: { gap: spacing.md },
  round: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  heading: { fontWeight: '600' },
  story: { fontSize: 16, lineHeight: 28 },
  blank: { fontWeight: '600' },
  right: { color: colors.ok },
  wrong: { color: colors.error, textDecorationLine: 'line-through' },
  prompt: { color: colors.muted, fontSize: 13 },
  expression: { fontSize: 18, fontWeight: '700' },
  answer: { fontSize: 15 },
  note: { color: colors.muted, fontSize: 13 },
  reply: { fontSize: 15, fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    fontSize: 13,
  },
  verdict: { fontWeight: '600' },
  empty: { color: colors.muted },
})

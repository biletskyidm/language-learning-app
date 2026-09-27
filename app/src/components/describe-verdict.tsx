import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { DESCRIBE_PASS_SCORE, type DescribeVerdict as Verdict } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { scoreColor } from './score'
import { Text } from './themed'

type Props = {
  expression: string
  description: string
  verdict: Verdict
  meaning: string
  examples: string[]
}

const Example = ({ text, phrase }: { text: string; phrase: string }) => {
  const at = text.toLowerCase().indexOf(phrase.toLowerCase())
  if (at < 0) return <Text style={styles.example}>“{text}”</Text>

  return (
    <Text style={styles.example}>
      “{text.slice(0, at)}
      <Text style={styles.mark}>{text.slice(at, at + phrase.length)}</Text>
      {text.slice(at + phrase.length)}”
    </Text>
  )
}

export const DescribeVerdict = ({ expression, description, verdict, meaning, examples }: Props) => {
  const [allExamples, setAllExamples] = useState(false)
  const [first, ...rest] = examples
  const hidden = rest.length

  return (
    <View style={styles.stack}>
      <View style={styles.answer}>
        <Text style={styles.heading}>Your explanation</Text>
        <Text style={styles.body}>{description}</Text>
      </View>

      <View style={styles.verdict}>
        <Text style={[styles.score, { color: scoreColor(verdict.score) }]}>
          {verdict.score}/10 · {verdict.score >= DESCRIBE_PASS_SCORE ? 'Solid' : 'Shaky'}
        </Text>
        <Text style={styles.feedback}>{verdict.feedback}</Text>
      </View>

      <View style={styles.reference}>
        <Text style={styles.heading}>What it means</Text>
        <Text style={styles.body}>{meaning}</Text>
        {first ? <Example text={first} phrase={expression} /> : null}
        {allExamples ? rest.map((example) => <Example key={example} text={example} phrase={expression} />) : null}
        {hidden && !allExamples ? (
          <Pressable onPress={() => setAllExamples(true)} accessibilityRole="button">
            <Text style={styles.more}>
              {hidden} more {hidden === 1 ? 'example' : 'examples'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  heading: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  body: { fontSize: 16, lineHeight: 22 },
  answer: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, gap: 4 },
  verdict: { gap: 4 },
  score: { fontSize: 15, fontWeight: '800' },
  feedback: { fontSize: 14, lineHeight: 20, color: colors.muted },
  reference: { backgroundColor: colors.bubble, borderRadius: 12, padding: spacing.md, gap: 6 },
  example: { fontSize: 15, lineHeight: 21, fontStyle: 'italic', color: colors.muted },
  mark: { fontWeight: '700', color: colors.text },
  more: { color: colors.ok, fontSize: 14, fontWeight: '600' },
})

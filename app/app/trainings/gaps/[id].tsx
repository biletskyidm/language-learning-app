import { useEffect, useRef } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { GapsRound } from '@contracts'
import { useCancelTraining } from '../../../src/api/use-cancel-training'
import { useCompleteTraining } from '../../../src/api/use-complete-training'
import { useAnswerRound, useNextRound } from '../../../src/api/use-drill-round'
import { useTraining } from '../../../src/api/use-training'
import { useGapsBoard } from '../../../src/components/gaps-board'
import { openEndMenu } from '../../../src/components/session-menu'
import { colors, spacing } from '../../../src/theme/tokens'

/** Drawn rather than left as whitespace, which collapses when a blank lands at a line wrap. */
const BLANK = '______'

const Story = ({ round, board }: { round: GapsRound; board: ReturnType<typeof useGapsBoard> }) => {
  const verdict = round.verdict?.perBlank

  return (
    <Text style={styles.story}>
      {round.material.parts.map((part, blank) => (
        <Text key={blank}>
          {part}
          {blank < round.material.parts.length - 1 ? (
            <Text
              onPress={() => board.clear(blank)}
              accessibilityRole="button"
              accessibilityLabel={`Blank ${blank + 1}, ${board.fills[blank] ?? 'empty'}`}
              style={[
                styles.blank,
                board.fills[blank] ? styles.blankFilled : styles.blankEmpty,
                verdict?.[blank] && (verdict[blank]?.correct ? styles.blankRight : styles.blankWrong),
              ]}
            >
              {board.fills[blank] ?? BLANK}
            </Text>
          ) : null}
        </Text>
      ))}
    </Text>
  )
}

export default function Gaps() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const training = useTraining(id)
  const next = useNextRound(id)
  const answer = useAnswerRound(id)
  const complete = useCompleteTraining(id)
  const cancel = useCancelTraining()
  const dealt = useRef(false)

  const session = training.data?.type === 'gaps' ? training.data : undefined
  const round = session?.rounds.at(-1)
  const board = useGapsBoard(round)
  const active = session?.status === 'ACTIVE'
  const busy = next.isPending || answer.isPending || complete.isPending || cancel.isPending

  useEffect(() => {
    if (dealt.current || !active || session?.rounds.length !== 0) return

    dealt.current = true
    next.mutate()
  }, [active, session?.rounds.length, next])

  if (training.isPending) return <ActivityIndicator style={styles.state} />
  if (training.isError || !session) return <Text style={styles.error}>Could not open this drill</Text>

  const canEnd = active && !busy
  const endMenu = () => {
    if (canEnd) openEndMenu({
      onEnd: () => complete.mutate(),
      onCancel: () => cancel.mutate(id),
      ending: 'End keeps this session with its round counters. Cancel drops it.',
    })
  }
  const check = () => {
    if (round && board.ready && !busy) answer.mutate({ index: round.index, fills: board.fills as string[] })
  }
  const right = round?.verdict?.perBlank.filter(({ correct }) => correct).length ?? 0

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Gaps',
          headerRight: active
            ? () => (
                <Pressable onPress={endMenu} disabled={!canEnd} accessibilityRole="button">
                  <Text style={[styles.headerAction, !canEnd && styles.off]}>End</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.md }]}>
        {session.aggregates ? (
          <Text style={styles.summary}>
            {session.aggregates.rounds} rounds · {session.aggregates.correct} right · {session.aggregates.wrong} wrong
          </Text>
        ) : null}
        {session.status === 'CANCELED' ? <Text style={styles.canceled}>Session canceled</Text> : null}

        {round ? <Story round={round} board={board} /> : null}

        {active && board.phase === 'playing' ? (
          <>
            <View style={styles.bank}>
              {round?.material.bank.map((phrase) => (
                <Pressable
                  key={phrase}
                  onPress={() => board.place(phrase)}
                  disabled={board.placed(phrase)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: board.placed(phrase) }}
                  style={[styles.chip, board.placed(phrase) && styles.off]}
                >
                  <Text style={styles.chipLabel}>{phrase}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={check}
              disabled={!board.ready || busy}
              accessibilityRole="button"
              style={[styles.button, (!board.ready || busy) && styles.off]}
            >
              <Text style={styles.buttonLabel}>Check</Text>
            </Pressable>
          </>
        ) : null}

        {board.phase === 'checked' && round ? (
          <>
            <Text style={styles.score}>
              {right} of {round.verdict?.perBlank.length} in the right place.
            </Text>
            {active ? (
              <Pressable
                onPress={() => next.mutate()}
                disabled={busy}
                accessibilityRole="button"
                style={[styles.secondary, busy && styles.off]}
              >
                <Text style={styles.secondaryLabel}>Another one</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {busy ? <ActivityIndicator style={styles.state} /> : null}
        {active && next.isError ? (
          <>
            <Text style={styles.error}>Could not put together a round</Text>
            <Pressable onPress={() => next.mutate()} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryLabel}>Try again</Text>
            </Pressable>
          </>
        ) : null}
        {answer.isError ? <Text style={styles.error}>Could not check that — try again</Text> : null}
        {complete.isError ? <Text style={styles.error}>Could not end the session — try again</Text> : null}
        {cancel.isError ? <Text style={styles.error}>Could not cancel the session — try again</Text> : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: spacing.md, gap: spacing.md },
  story: { fontSize: 17, lineHeight: 30 },
  blank: { fontSize: 16 },
  blankEmpty: { color: colors.border },
  blankFilled: { color: colors.warn, fontWeight: '600', textDecorationLine: 'underline' },
  blankRight: { color: colors.ok, fontWeight: '600' },
  blankWrong: { color: colors.error, fontWeight: '600', textDecorationLine: 'line-through' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  chipLabel: { fontSize: 13 },
  button: { backgroundColor: colors.ok, borderRadius: 8, paddingVertical: spacing.sm, alignItems: 'center' },
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryLabel: { fontSize: 15, fontWeight: '600' },
  score: { color: colors.muted, fontSize: 15 },
  summary: { fontWeight: '600' },
  canceled: { color: colors.muted },
  headerAction: { color: colors.error, fontSize: 16, fontWeight: '600' },
  off: { opacity: 0.4 },
  state: { paddingVertical: spacing.md },
  error: { color: colors.error, textAlign: 'center' },
})

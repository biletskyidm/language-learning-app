import { useEffect, useRef } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, TextInput } from '../../../src/components/themed'
import { DESCRIBE_MAX_LENGTH } from '@contracts'
import { ApiError } from '../../../src/api/client'
import { useCancelTraining } from '../../../src/api/use-cancel-training'
import { useCompleteTraining } from '../../../src/api/use-complete-training'
import { useAnswerRound, useNextRound } from '../../../src/api/use-drill-round'
import { useExpression } from '../../../src/api/use-expression'
import { useTraining } from '../../../src/api/use-training'
import { useDescribeDraft } from '../../../src/components/describe-draft'
import { DescribeVerdict } from '../../../src/components/describe-verdict'
import { openEndMenu } from '../../../src/components/session-menu'
import { colors, spacing } from '../../../src/theme/tokens'

const answerError = (error: unknown) =>
  error instanceof ApiError && error.code === 'USES_TARGET_WORDS'
    ? error.message
    : 'Could not send that — try again'

export default function Describe() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const training = useTraining(id)
  const next = useNextRound(id)
  const answer = useAnswerRound(id)
  const complete = useCompleteTraining(id)
  const cancel = useCancelTraining()
  const dealt = useRef(false)

  const session = training.data?.type === 'describe' ? training.data : undefined
  const round = session?.rounds.at(-1)
  const draft = useDescribeDraft(round)
  const details = useExpression(round?.material.targetExpressionId)
  const insets = useSafeAreaInsets()
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
    if (canEnd) {
      openEndMenu({
        onEnd: () => complete.mutate(),
        onCancel: () => cancel.mutate(id),
        ending: 'End keeps this session with its round counters. Cancel drops it.',
      })
    }
  }
  const send = () => {
    if (round && draft.ready && !busy) {
      answer.mutate({ index: round.index, answer: { description: draft.description.trim() } })
    }
  }
  const verdict = round?.verdict
  const lastRound = round !== undefined && round.index + 1 >= session.targets.length
  const advance = () => (lastRound ? complete.mutate() : next.mutate())

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Describe it',
        }}
      />
      {active ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={endMenu} disabled={!canEnd} tintColor={colors.error}>
            End
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {session.aggregates ? (
          <Text style={styles.summary}>
            {session.aggregates.rounds} rounds · {session.aggregates.correct} solid · {session.aggregates.wrong} shaky
          </Text>
        ) : null}
        {session.status === 'CANCELED' ? <Text style={styles.canceled}>Session canceled</Text> : null}

        {round ? (
          <View style={styles.card}>
            <Text style={styles.prompt}>Explain this without using its words</Text>
            <Text style={styles.expression}>{round.material.expression}</Text>
          </View>
        ) : null}

        {round && draft.phase === 'writing' && active ? (
          <>
            <TextInput
              style={styles.input}
              value={draft.description}
              onChangeText={draft.write}
              placeholder="Say what it means in your own words"
              placeholderTextColor={colors.muted}
              maxLength={DESCRIBE_MAX_LENGTH}
              editable={!busy}
              multiline
            />
            <Pressable
              onPress={send}
              disabled={!draft.ready || busy}
              accessibilityRole="button"
              style={[styles.button, (!draft.ready || busy) && styles.off]}
            >
              <Text style={styles.buttonLabel}>Check</Text>
            </Pressable>
          </>
        ) : null}

        {round && draft.phase === 'judged' && verdict ? (
          <DescribeVerdict
            expression={round.material.expression}
            description={draft.description}
            verdict={verdict}
            meaning={details.data?.meaning ?? round.targets[0]?.meaning ?? ''}
            examples={details.data?.examples ?? []}
          />
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
        {answer.isError ? <Text style={styles.error}>{answerError(answer.error)}</Text> : null}
        {complete.isError ? <Text style={styles.error}>Could not end the session — try again</Text> : null}
        {cancel.isError ? <Text style={styles.error}>Could not cancel the session — try again</Text> : null}
      </ScrollView>
      {round && draft.phase === 'judged' && active ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            onPress={advance}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.button, busy && styles.off]}
          >
            <Text style={styles.buttonLabel}>
              {lastRound ? 'Finish session' : `Next phrase · ${round.index + 2} of ${session.targets.length}`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: spacing.md, gap: spacing.md },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, gap: 4 },
  prompt: { color: colors.muted, fontSize: 13 },
  expression: { fontSize: 22, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 110,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  button: { backgroundColor: colors.ok, borderRadius: 8, paddingVertical: spacing.sm, alignItems: 'center' },
  buttonLabel: { color: colors.onAccent, fontSize: 15, fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryLabel: { fontSize: 15, fontWeight: '600' },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summary: { fontWeight: '600' },
  canceled: { color: colors.muted },
  off: { opacity: 0.4 },
  state: { paddingVertical: spacing.md },
  error: { color: colors.error, textAlign: 'center' },
})

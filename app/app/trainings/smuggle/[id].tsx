import { useEffect, useRef } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SMUGGLE_MAX_LENGTH } from '@contracts'
import { useCancelTraining } from '../../../src/api/use-cancel-training'
import { useCompleteTraining } from '../../../src/api/use-complete-training'
import { useAnswerRound, useNextRound } from '../../../src/api/use-drill-round'
import { useTraining } from '../../../src/api/use-training'
import { openEndMenu } from '../../../src/components/session-menu'
import { useSmuggleDraft } from '../../../src/components/smuggle-draft'
import { colors, spacing } from '../../../src/theme/tokens'

export default function Smuggle() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const training = useTraining(id)
  const next = useNextRound(id)
  const answer = useAnswerRound(id)
  const complete = useCompleteTraining(id)
  const cancel = useCancelTraining()
  const dealt = useRef(false)

  const session = training.data?.type === 'smuggle' ? training.data : undefined
  const round = session?.rounds.at(-1)
  const draft = useSmuggleDraft(round)
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
      answer.mutate({ index: round.index, answer: { message: draft.message.trim() } })
    }
  }
  const verdict = round?.verdict

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Smuggle',
          headerRight: active
            ? () => (
                <Pressable onPress={endMenu} disabled={!canEnd} accessibilityRole="button">
                  <Text style={[styles.headerAction, !canEnd && styles.off]}>End</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {session.aggregates ? (
          <Text style={styles.summary}>
            {session.aggregates.rounds} rounds · {session.aggregates.correct} landed · {session.aggregates.wrong} missed
          </Text>
        ) : null}
        {session.status === 'CANCELED' ? <Text style={styles.canceled}>Session canceled</Text> : null}

        {round ? (
          <>
            <Text style={styles.prompt}>Work all three into one natural message</Text>
            <View style={styles.chips}>
              {round.material.targets.map((target) => {
                const ok = draft.landed.get(target.expression)

                return (
                  <View
                    key={target.expressionId}
                    accessibilityLabel={`${target.expression}, ${
                      ok === undefined ? 'not judged yet' : ok ? 'landed' : 'missed'
                    }`}
                    style={[styles.chip, ok === true && styles.chipOk, ok === false && styles.chipBad]}
                  >
                    <Text style={[styles.chipLabel, ok !== undefined && styles.chipLabelJudged]}>
                      {target.expression}
                    </Text>
                  </View>
                )
              })}
            </View>
          </>
        ) : null}

        {round && draft.phase === 'writing' && active ? (
          <>
            <TextInput
              style={styles.input}
              value={draft.message}
              onChangeText={draft.write}
              placeholder="Write one message that uses all three"
              placeholderTextColor={colors.muted}
              maxLength={SMUGGLE_MAX_LENGTH}
              editable={!busy}
              multiline
            />
            <Pressable
              onPress={send}
              disabled={!draft.ready || busy}
              accessibilityRole="button"
              style={[styles.button, (!draft.ready || busy) && styles.off]}
            >
              <Text style={styles.buttonLabel}>Send</Text>
            </Pressable>
          </>
        ) : null}

        {draft.phase === 'judged' && verdict ? (
          <>
            <Text style={styles.message}>{draft.message}</Text>
            <Text style={styles.reply}>{verdict.reply}</Text>
            {verdict.results.map(({ expression, ok, note }) => (
              <Text key={expression} style={styles.note}>
                <Text style={ok ? styles.right : styles.wrong}>{expression}</Text> — {note}
              </Text>
            ))}
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
  prompt: { color: colors.muted, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  chipOk: { borderColor: colors.ok, backgroundColor: colors.ok },
  chipBad: { borderColor: colors.error, backgroundColor: colors.error },
  chipLabel: { fontSize: 13, color: colors.muted },
  chipLabelJudged: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 130,
    fontSize: 16,
    textAlignVertical: 'top',
  },
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
  message: { fontSize: 16, lineHeight: 24 },
  reply: {
    fontSize: 16,
    lineHeight: 24,
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
  },
  note: { color: colors.muted, fontSize: 13 },
  right: { color: colors.ok, fontWeight: '600' },
  wrong: { color: colors.error, fontWeight: '600' },
  summary: { fontWeight: '600' },
  canceled: { color: colors.muted },
  headerAction: { color: colors.error, fontSize: 16, fontWeight: '600' },
  off: { opacity: 0.4 },
  state: { paddingVertical: spacing.md },
  error: { color: colors.error, textAlign: 'center' },
})

import { useState } from 'react'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { createTrainingInputSchema, GAPS_TARGETS_DEFAULT, type ChatStyle, type Expression } from '@contracts'
import { srsSummary } from '../src/api/expression-srs'
import { useCreateTraining } from '../src/api/use-create-training'
import { useExpressions } from '../src/api/use-expressions'
import { usePickedExpressions } from '../src/api/use-picked-expressions'
import { MAX_TARGETS, useTargetSelection } from '../src/api/use-target-selection'
import { Chip } from '../src/components/chip'
import { ExpressionPicker } from '../src/components/expression-picker'
import { trainingRoute } from '../src/components/training-route'
import { colors, spacing } from '../src/theme/tokens'

const STYLES: [ChatStyle, string][] = [
  ['informal', 'informal'],
  ['formal', 'formal'],
]

type Mode = 'chat' | 'gaps' | 'describe'

const MODES: [Mode, string][] = [
  ['chat', 'Chat'],
  ['gaps', 'Gaps'],
  ['describe', 'Describe it'],
]

const HINTS: Record<Exclude<Mode, 'chat'>, string> = {
  gaps: 'A short paragraph with these phrases cut out. Put them back.',
  describe: 'One phrase at a time. Explain it without using its words and see if the tutor guesses.',
}

const START_LABELS: Record<Mode, string> = { chat: 'Start chat', gaps: 'Start gaps', describe: 'Start describe it' }

type RowProps = {
  item: Expression
  suggested: boolean
  removable: boolean
  onRemove: () => void
}

const Row = ({ item, suggested, removable, onRemove }: RowProps) => (
  <View style={styles.row}>
    <Pressable style={styles.rowBody} onPress={() => router.push(`/expressions/${item.id}`)}>
      <Text style={styles.expression}>{item.expression}</Text>
      <Text style={styles.meaning}>{item.meaning}</Text>
      <Text style={suggested ? styles.suggestedStats : styles.stats}>{srsSummary(item, new Date())}</Text>
    </Pressable>
    {removable ? (
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel="Remove"
        hitSlop={8}
        style={styles.remove}
      >
        <Text style={styles.removeIcon}>×</Text>
      </Pressable>
    ) : null}
  </View>
)

const StartSession = ({ targets, initialMode }: { targets: Expression[]; initialMode: Mode }) => {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [context, setContext] = useState('')
  const [style, setStyle] = useState<ChatStyle>('informal')
  const create = useCreateTraining()

  const expressionIds = targets.map((target) => target.id)
  const input = createTrainingInputSchema.safeParse(
    mode === 'chat' ? { type: 'chat', context, style, expressionIds } : { type: mode, expressionIds },
  )

  const start = () =>
    input.success &&
    create.mutate(input.data, {
      onSuccess: (training) => {
        const route = trainingRoute(training.type, training.id)
        router.replace('/trainings')
        if (route) router.push(route)
      },
    })

  return (
    <View style={styles.start}>
      <View style={styles.styles}>
        {MODES.map(([value, label]) => (
          <Chip key={value} label={label} active={mode === value} onPress={() => setMode(value)} />
        ))}
      </View>
      {mode === 'chat' ? (
        <>
          <TextInput
            style={styles.context}
            value={context}
            onChangeText={setContext}
            placeholder="What is the situation? e.g. a scrum standup"
            placeholderTextColor={colors.muted}
            multiline
          />
          <View style={styles.styles}>
            {STYLES.map(([value, label]) => (
              <Chip key={value} label={label} active={style === value} onPress={() => setStyle(value)} />
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.hint}>{HINTS[mode]}</Text>
      )}
      {create.isError ? <Text style={styles.error}>Could not start the session</Text> : null}
      <Pressable
        onPress={start}
        accessibilityRole="button"
        disabled={!input.success || create.isPending}
        style={[styles.startButton, (!input.success || create.isPending) && styles.startButtonOff]}
      >
        <Text style={styles.startLabel}>{create.isPending ? 'Starting…' : START_LABELS[mode]}</Text>
      </Pressable>
    </View>
  )
}

const Targets = ({ initial, mode }: { initial: Expression[]; mode: Mode }) => {
  const vocabulary = useExpressions()
  const { targets, remove, add } = useTargetSelection(initial, vocabulary.data?.items)
  const [picking, setPicking] = useState(false)
  const suggested = new Set(initial.map((item) => item.id))

  return (
    <>
      {picking ? (
        <ExpressionPicker
          title="Add an expression"
          excludedIds={targets.map((target) => target.id)}
          onSelect={add}
          onClose={() => setPicking(false)}
        />
      ) : null}
      <FlatList
        data={targets}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Row
            item={item}
            suggested={suggested.has(item.id)}
            removable={targets.length > 1}
            onRemove={() => remove(index)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {targets.length < MAX_TARGETS ? (
        <Pressable onPress={() => setPicking(true)} accessibilityRole="button" style={styles.add}>
          <Text style={styles.addLabel}>Add an expression</Text>
        </Pressable>
      ) : null}
      <StartSession targets={targets} initialMode={mode} />
    </>
  )
}

const startMode = (mode?: string): Mode => (mode === 'gaps' || mode === 'describe' ? mode : 'chat')

export default function Practice() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const picked = usePickedExpressions()
  const items = picked.data?.items

  const body = () => {
    if (items) {
      return items.length ? (
        <Targets initial={mode === 'gaps' ? items.slice(0, GAPS_TARGETS_DEFAULT) : items} mode={startMode(mode)} />
      ) : (
        <Text style={styles.state}>Nothing to practice right now</Text>
      )
    }
    if (picked.isError) return <Text style={styles.error}>Could not work out what to practice</Text>
    return <ActivityIndicator style={styles.state} />
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'What to practice' }} />
      {body()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowBody: { flex: 1, gap: 2 },
  expression: { fontSize: 16, fontWeight: '600' },
  meaning: { color: colors.muted },
  stats: { color: colors.muted, fontSize: 12 },
  suggestedStats: { color: colors.ok, fontSize: 12 },
  remove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 18 },
  separator: { height: 1, backgroundColor: colors.border },
  add: { paddingVertical: spacing.sm, alignItems: 'center' },
  addLabel: { color: colors.ok, fontSize: 15, fontWeight: '600' },
  start: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  context: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 60,
  },
  styles: { flexDirection: 'row', gap: spacing.sm },
  hint: { color: colors.muted },
  startButton: { backgroundColor: colors.ok, borderRadius: 8, paddingVertical: spacing.sm, alignItems: 'center' },
  startButtonOff: { opacity: 0.4 },
  startLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

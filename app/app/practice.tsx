import { useState } from 'react'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  createTrainingInputSchema,
  DEFAULT_SETTINGS,
  TARGETS_SETTING,
  type ChatStyle,
  type Expression,
  type Scenario,
} from '@contracts'
import { srsSummary } from '../src/api/expression-srs'
import { useCreateTraining } from '../src/api/use-create-training'
import { useExpressions } from '../src/api/use-expressions'
import { usePickedExpressions } from '../src/api/use-picked-expressions'
import { useScenarios } from '../src/api/use-scenarios'
import { useSettings } from '../src/api/use-settings'
import { MAX_TARGETS, useTargetSelection } from '../src/api/use-target-selection'
import { Chip } from '../src/components/chip'
import { ExpressionPicker } from '../src/components/expression-picker'
import { trainingRoute } from '../src/components/training-route'
import { colors, spacing } from '../src/theme/tokens'

const STYLES: [ChatStyle, string][] = [
  ['informal', 'informal'],
  ['formal', 'formal'],
]

type Mode = 'chat' | 'gaps' | 'describe' | 'smuggle'

const MODES: [Mode, string][] = [
  ['chat', 'Chat'],
  ['gaps', 'Gaps'],
  ['describe', 'Describe it'],
  ['smuggle', 'Smuggle'],
]

const HINTS: Record<Exclude<Mode, 'chat'>, string> = {
  gaps: 'A short paragraph with these phrases cut out. Put them back.',
  describe: 'One phrase at a time. Explain it without using its words and the tutor scores you.',
  smuggle: 'Work every phrase into one natural message and see which ones land.',
}

const START_LABELS: Record<Mode, string> = {
  chat: 'Start chat',
  gaps: 'Start gaps',
  describe: 'Start describe it',
  smuggle: 'Start smuggle',
}

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

type Draft = {
  presets: Scenario[]
  context: string
  onContext: (context: string) => void
  style: ChatStyle
  onStyle: (style: ChatStyle) => void
  scenarioId?: string
  onScenario: (scenario: Scenario) => void
}

type PresetsProps = { presets: Scenario[]; selected?: string; onSelect: (scenario: Scenario) => void }

const Presets = ({ presets, selected, onSelect }: PresetsProps) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
    {presets.map((scenario) => (
      <Chip
        key={scenario.id}
        label={scenario.name}
        active={selected === scenario.id}
        onPress={() => onSelect(scenario)}
      />
    ))}
  </ScrollView>
)

type StartProps = { targets: Expression[]; mode: Mode; onMode: (mode: Mode) => void; draft: Draft }

const StartSession = ({ targets, mode, onMode, draft }: StartProps) => {
  const create = useCreateTraining()

  const expressionIds = targets.map((target) => target.id)
  const scene = draft.scenarioId ? { scenarioId: draft.scenarioId } : { context: draft.context, style: draft.style }
  const input = createTrainingInputSchema.safeParse(
    mode === 'chat' ? { type: 'chat', ...scene, expressionIds } : { type: mode, expressionIds },
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
          <Chip key={value} label={label} active={mode === value} onPress={() => onMode(value)} />
        ))}
      </View>
      {mode === 'chat' ? (
        <>
          <Presets presets={draft.presets} selected={draft.scenarioId} onSelect={draft.onScenario} />
          <TextInput
            style={styles.context}
            value={draft.context}
            onChangeText={draft.onContext}
            placeholder="What is the situation? e.g. a scrum standup"
            placeholderTextColor={colors.muted}
            multiline
          />
          <View style={styles.styles}>
            {STYLES.map(([value, label]) => (
              <Chip key={value} label={label} active={draft.style === value} onPress={() => draft.onStyle(value)} />
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

type TargetsProps = { initial: Expression[]; mode: Mode; onMode: (mode: Mode) => void; draft: Draft }

const Targets = ({ initial, mode, onMode, draft }: TargetsProps) => {
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
      <StartSession targets={targets} mode={mode} onMode={onMode} draft={draft} />
    </>
  )
}

const MODE_NAMES = new Set<string>(MODES.map(([value]) => value))

const startMode = (mode?: string): Mode => (mode && MODE_NAMES.has(mode) ? (mode as Mode) : 'chat')

export default function Practice() {
  const params = useLocalSearchParams<{ mode?: string }>()
  const [mode, setMode] = useState<Mode>(startMode(params.mode))
  const [context, setContext] = useState('')
  const [style, setStyle] = useState<ChatStyle>()
  const [scenarioId, setScenarioId] = useState<string>()
  const saved = useSettings()
  const settings = saved.isPending ? undefined : (saved.data ?? DEFAULT_SETTINGS)
  const presets = useScenarios().data?.items ?? []
  const chosen = presets.find((scenario) => scenario.id === scenarioId)
  const picked = usePickedExpressions(settings && settings[TARGETS_SETTING[mode]])
  const items = picked.data?.items

  const body = () => {
    if (settings && items) {
      return items.length ? (
        <Targets
          key={mode}
          initial={items}
          mode={mode}
          onMode={setMode}
          draft={{
            presets,
            context: chosen?.context ?? context,
            onContext: (next) => {
              setContext(next)
              setScenarioId(undefined)
            },
            style: chosen?.style ?? style ?? settings.defaultStyle,
            onStyle: (next) => {
              setStyle(next)
              setScenarioId(undefined)
            },
            scenarioId: chosen?.id,
            onScenario: (scenario) => {
              setContext(scenario.context)
              setStyle(scenario.style)
              setScenarioId(scenario.id)
            },
          }}
        />
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
  presets: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hint: { color: colors.muted },
  startButton: { backgroundColor: colors.ok, borderRadius: 8, paddingVertical: spacing.sm, alignItems: 'center' },
  startButtonOff: { opacity: 0.4 },
  startLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

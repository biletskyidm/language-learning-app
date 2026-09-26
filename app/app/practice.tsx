import { useState } from 'react'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, TextInput } from '../src/components/themed'
import {
  createTrainingInputSchema,
  DEFAULT_SETTINGS,
  TARGETS_SETTING,
  type ChatStyle,
  type Expression,
  type Scenario,
} from '@contracts'
import { useCreateTraining } from '../src/api/use-create-training'
import { useExpressions } from '../src/api/use-expressions'
import { useExpression } from '../src/api/use-expression'
import { usePickedExpressions } from '../src/api/use-picked-expressions'
import { useScenarios } from '../src/api/use-scenarios'
import { useSettings } from '../src/api/use-settings'
import { MAX_TARGETS, useTargetSelection } from '../src/api/use-target-selection'
import { Chip } from '../src/components/chip'
import { ExpressionPicker } from '../src/components/expression-picker'
import { ModeTiles, type ModeTile } from '../src/components/mode-tiles'
import { PracticeTargetChips } from '../src/components/practice-target-chips'
import { trainingRoute } from '../src/components/training-route'
import { colors, spacing } from '../src/theme/tokens'

const STYLES: [ChatStyle, string][] = [
  ['informal', 'informal'],
  ['formal', 'formal'],
]

type Mode = 'chat' | 'gaps' | 'describe' | 'smuggle'

const MODES: ModeTile<Mode>[] = [
  { mode: 'chat', emoji: '💬', name: 'Chat', blurb: 'Role-play a situation with the tutor.' },
  { mode: 'describe', emoji: '🗣️', name: 'Describe it', blurb: 'Explain each phrase without using its words.' },
  { mode: 'smuggle', emoji: '🎒', name: 'Smuggle', blurb: 'Work every phrase into one natural message.' },
]

const EMOJIS = Object.fromEntries(MODES.map(({ mode, emoji }) => [mode, emoji])) as Record<Mode, string>

const START_LABELS: Record<Mode, string> = {
  chat: 'Start chat',
  gaps: 'Start gaps',
  describe: 'Start describe it',
  smuggle: 'Start smuggle',
}

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

const ChatScene = ({ draft }: { draft: Draft }) => (
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
)

type StartProps = { targets: Expression[]; mode: Mode; draft: Draft }

const StartSession = ({ targets, mode, draft }: StartProps) => {
  const create = useCreateTraining()
  const insets = useSafeAreaInsets()

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
    <View style={[styles.start, { paddingBottom: insets.bottom + spacing.sm }]}>
      {create.isError ? <Text style={styles.startError}>Could not start the session</Text> : null}
      <Pressable
        onPress={start}
        accessibilityRole="button"
        disabled={!input.success || create.isPending}
        style={[styles.startButton, (!input.success || create.isPending) && styles.startButtonOff]}
      >
        <Text style={styles.startLabel}>{create.isPending ? 'Starting…' : `${EMOJIS[mode]} ${START_LABELS[mode]}`}</Text>
      </Pressable>
    </View>
  )
}

type TargetsProps = { initial: Expression[]; mode: Mode; onMode: (mode: Mode) => void; draft: Draft }

const Targets = ({ initial, mode, onMode, draft }: TargetsProps) => {
  const vocabulary = useExpressions()
  const { targets, remove, add } = useTargetSelection(initial, vocabulary.data?.items)
  const [picking, setPicking] = useState(false)

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
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.caption}>PHRASES</Text>
        <PracticeTargetChips
          targets={targets}
          onOpen={(target) => router.push(`/expressions/${target.id}`)}
          onRemove={remove}
          onAdd={targets.length < MAX_TARGETS ? () => setPicking(true) : undefined}
        />
        <Text style={[styles.caption, styles.captionGap]}>HOW</Text>
        <ModeTiles modes={MODES} selected={mode} onSelect={onMode} />
        {mode === 'chat' ? <ChatScene draft={draft} /> : null}
      </ScrollView>
      <StartSession targets={targets} mode={mode} draft={draft} />
    </>
  )
}

const MODE_NAMES = new Set<string>(MODES.map(({ mode }) => mode))

const startMode = (mode?: string): Mode => (mode && MODE_NAMES.has(mode) ? (mode as Mode) : 'chat')

export default function Practice() {
  const params = useLocalSearchParams<{ mode?: string; expressionId?: string }>()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<Mode>(startMode(params.mode))
  const [context, setContext] = useState('')
  const [style, setStyle] = useState<ChatStyle>()
  const [scenarioId, setScenarioId] = useState<string>()
  const saved = useSettings()
  const settings = saved.isPending ? undefined : (saved.data ?? DEFAULT_SETTINGS)
  const presets = useScenarios().data?.items ?? []
  const chosen = presets.find((scenario) => scenario.id === scenarioId)
  const named = useExpression(params.expressionId)
  const picked = usePickedExpressions(params.expressionId ? undefined : settings && settings[TARGETS_SETTING[mode]])
  const items = params.expressionId ? (named.data ? [named.data] : undefined) : picked.data?.items

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
              if (chosen) setStyle(chosen.style)
              setScenarioId(undefined)
            },
            style: chosen?.style ?? style ?? settings.defaultStyle,
            onStyle: (next) => {
              if (chosen) setContext(chosen.context)
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
    if (picked.isError || named.isError) return <Text style={styles.error}>Could not work out what to practice</Text>
    return <ActivityIndicator style={styles.state} />
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <Stack.Screen options={{ title: 'What to practice' }} />
      {body()}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { gap: spacing.sm + 4, padding: spacing.md },
  caption: { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  captionGap: { marginTop: spacing.sm },
  start: {
    gap: spacing.sm,
    paddingTop: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  context: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 60,
  },
  styles: { flexDirection: 'row', gap: spacing.sm },
  presets: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  startButton: { backgroundColor: colors.ok, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  startButtonOff: { opacity: 0.4 },
  startError: { color: colors.error, textAlign: 'center' },
  startLabel: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

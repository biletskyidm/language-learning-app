import { useState } from 'react'
import { Stack } from 'expo-router'
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from './themed'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  createExpressionInputSchema,
  type CreateExpressionInput,
  type Expression,
  type ExpressionDraft,
  type ExpressionType,
  type Frequency,
  type PartOfSpeech,
} from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { Chip } from './chip'

const TYPES: [ExpressionType, string][] = [
  ['word', 'word'],
  ['phrase', 'phrase'],
  ['idiom', 'idiom'],
  ['sentence', 'sentence'],
  ['collocation', 'collocation'],
  ['phrasal_verb', 'phrasal verb'],
]

const PARTS_OF_SPEECH: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb']

const FREQUENCIES: [Frequency, string][] = [
  ['very_common', 'very common'],
  ['common', 'common'],
  ['moderate', 'moderate'],
  ['uncommon', 'uncommon'],
  ['formal/academic', 'formal/academic'],
]

type Props = {
  title: string
  initial?: Expression
  pending: boolean
  error?: string
  onFill?: (text: string) => Promise<ExpressionDraft>
  onSubmit: (draft: CreateExpressionInput) => void
}

export const ExpressionForm = ({ title, initial, pending, error, onFill, onSubmit }: Props) => {
  const insets = useSafeAreaInsets()
  const [expression, setExpression] = useState(initial?.expression ?? '')
  const [type, setType] = useState<ExpressionType>(initial?.type ?? 'phrase')
  const [partOfSpeech, setPartOfSpeech] = useState(initial?.partOfSpeech)
  const [meaning, setMeaning] = useState(initial?.meaning ?? '')
  const [examples, setExamples] = useState(initial?.examples.length ? initial.examples : [''])
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [tagDraft, setTagDraft] = useState('')
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'common')
  const [filling, setFilling] = useState(false)
  const [fillError, setFillError] = useState<string>()

  const draft = createExpressionInputSchema.safeParse({
    expression,
    type,
    partOfSpeech,
    meaning,
    examples: examples.filter((example) => example.trim()),
    tags,
    frequency,
  })

  const fillDisabled = !expression.trim() || filling || pending

  const submit = draft.success && !pending ? () => onSubmit(draft.data) : undefined

  const fill = async () => {
    if (!onFill) return
    Keyboard.dismiss()
    setFilling(true)
    setFillError(undefined)
    try {
      const drafted = await onFill(expression.trim())
      setType(drafted.type)
      setPartOfSpeech(drafted.partOfSpeech)
      setMeaning(drafted.meaning)
      setExamples(drafted.examples.length ? drafted.examples : [''])
      setTags(drafted.tags)
      setFrequency(drafted.frequency)
    } catch {
      setFillError('Could not draft this expression')
    } finally {
      setFilling(false)
    }
  }

  const addTag = () => {
    const tag = tagDraft.trim()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setTagDraft('')
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{
          title,
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={submit} disabled={!submit} tintColor={colors.ok}>
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Expression</Text>
      <View style={styles.fillWrap}>
        <TextInput
          style={[styles.input, onFill && styles.fillInput]}
          value={expression}
          onChangeText={setExpression}
          placeholder="hit the nail on the head"
          autoCapitalize="none"
          autoFocus={!initial}
          editable={!filling}
        />
        {onFill ? (
          <Pressable
            onPress={fill}
            disabled={fillDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: fillDisabled }}
            style={[styles.fill, fillDisabled && styles.disabled]}
          >
            <Text style={styles.fillLabel}>✨</Text>
            <Text style={styles.fillLabel}>{filling ? 'Drafting…' : 'Fill with AI'}</Text>
          </Pressable>
        ) : null}
      </View>
      {fillError ? <Text style={styles.error}>{fillError}</Text> : null}

      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {TYPES.map(([value, label]) => (
          <Chip key={value} label={label} active={type === value} onPress={() => setType(value)} />
        ))}
      </View>

      <Text style={styles.label}>Part of speech</Text>
      <View style={styles.row}>
        {PARTS_OF_SPEECH.map((value) => (
          <Chip
            key={value}
            label={value}
            active={partOfSpeech === value}
            onPress={() => setPartOfSpeech(partOfSpeech === value ? undefined : value)}
          />
        ))}
      </View>

      <Text style={styles.label}>Meaning</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={meaning}
        onChangeText={setMeaning}
        placeholder="to describe exactly what is causing a problem"
        multiline
      />

      <View style={styles.labelRow}>
        <Text style={styles.label}>Examples</Text>
        <Pressable
          onPress={() => setExamples([...examples, ''])}
          accessibilityRole="button"
          accessibilityLabel="Add example"
          style={styles.add}
        >
          <Text style={styles.addLabel}>+</Text>
        </Pressable>
      </View>
      {examples.map((example, index) => (
        <View key={index} style={styles.exampleRow}>
          <TextInput
            style={[styles.input, styles.exampleInput]}
            value={example}
            onChangeText={(text) => setExamples(examples.map((current, i) => (i === index ? text : current)))}
            placeholder="You hit the nail on the head."
            multiline
          />
          <Pressable
            onPress={() => setExamples(examples.filter((_, i) => i !== index))}
            accessibilityRole="button"
            accessibilityLabel="Remove example"
            style={styles.remove}
          >
            <Text style={styles.removeLabel}>✕</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.label}>Tags</Text>
      <View style={styles.row}>
        {tags.map((tag) => (
          <Chip key={tag} label={`${tag} ✕`} active onPress={() => setTags(tags.filter((t) => t !== tag))} />
        ))}
      </View>
      <TextInput
        style={styles.input}
        value={tagDraft}
        onChangeText={setTagDraft}
        onSubmitEditing={addTag}
        onBlur={addTag}
        placeholder="Add a tag and press return"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />

      <Text style={styles.label}>Frequency</Text>
      <View style={styles.row}>
        {FREQUENCIES.map(([value, label]) => (
          <Chip key={value} label={label} active={frequency === value} onPress={() => setFrequency(value)} />
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm },
  label: { fontWeight: '600', marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
  },
  multiline: { minHeight: 64 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fillWrap: { justifyContent: 'center' },
  fillInput: { paddingRight: 130 },
  fill: {
    position: 'absolute',
    right: 6,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.okSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fillLabel: { color: colors.ok, fontWeight: '600', fontSize: 13 },
  disabled: { opacity: 0.4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  add: {
    marginTop: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.okSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { color: colors.ok, fontSize: 22, fontWeight: '600', lineHeight: 24 },
  exampleRow: { flexDirection: 'row', alignItems: 'center' },
  exampleInput: { flex: 1 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeLabel: { color: colors.muted, fontSize: 18 },
  error: { color: colors.error, textAlign: 'center' },
})

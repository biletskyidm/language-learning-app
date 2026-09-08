import { useState } from 'react'
import { Stack } from 'expo-router'
import { Button, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
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

  const submit = draft.success && !pending ? () => onSubmit(draft.data) : undefined

  const fill = async () => {
    if (!onFill) return
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
    >
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <Pressable onPress={submit} disabled={!submit} accessibilityRole="button" hitSlop={12}>
              <Text style={[styles.save, !submit && styles.saveDisabled]}>Save</Text>
            </Pressable>
          ),
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Expression</Text>
      <TextInput
        style={styles.input}
        value={expression}
        onChangeText={setExpression}
        placeholder="hit the nail on the head"
        autoCapitalize="none"
        autoFocus={!initial}
        editable={!filling}
      />

      {onFill ? (
        <>
          <Button
            title={filling ? 'Drafting…' : 'Fill with AI'}
            onPress={fill}
            disabled={!expression.trim() || filling || pending}
          />
          {fillError ? <Text style={styles.error}>{fillError}</Text> : null}
        </>
      ) : null}

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

      <Text style={styles.label}>Examples</Text>
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
            hitSlop={8}
          >
            <Text style={styles.remove}>✕</Text>
          </Pressable>
        </View>
      ))}
      <Button title="Add example" onPress={() => setExamples([...examples, ''])} />

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
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exampleInput: { flex: 1 },
  remove: { color: colors.muted, fontSize: 16 },
  error: { color: colors.error, textAlign: 'center' },
  save: { fontSize: 16, fontWeight: '600', color: colors.ok },
  saveDisabled: { color: colors.muted },
})

import { useState } from 'react'
import { Stack, router } from 'expo-router'
import { Button, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  createExpressionInputSchema,
  type ExpressionType,
  type Frequency,
  type PartOfSpeech,
} from '@contracts'
import { ApiError } from '../../src/api/client'
import { useCreateExpression } from '../../src/api/use-create-expression'
import { Chip } from '../../src/components/chip'
import { colors, spacing } from '../../src/theme/tokens'

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

const failure = (error: unknown) => {
  if (error instanceof ApiError && error.code === 'DUPLICATE') return 'That expression is already in your vocabulary'
  return error ? 'Could not save this expression' : undefined
}

export default function NewExpression() {
  const [expression, setExpression] = useState('')
  const [type, setType] = useState<ExpressionType>('phrase')
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>()
  const [meaning, setMeaning] = useState('')
  const [examples, setExamples] = useState([''])
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('common')

  const create = useCreateExpression()
  const draft = createExpressionInputSchema.safeParse({
    expression,
    type,
    partOfSpeech,
    meaning,
    examples: examples.filter((example) => example.trim()),
    tags,
    frequency,
  })

  const addTag = () => {
    const tag = tagDraft.trim()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setTagDraft('')
  }

  const save = () => {
    if (!draft.success) return
    create.mutate(draft.data, { onSuccess: (created) => router.replace(`/expressions/${created.id}`) })
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="on-drag">
      <Stack.Screen options={{ title: 'New expression' }} />

      <Text style={styles.label}>Expression</Text>
      <TextInput
        style={styles.input}
        value={expression}
        onChangeText={setExpression}
        placeholder="hit the nail on the head"
        autoCapitalize="none"
        autoFocus
      />

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

      {create.isError ? <Text style={styles.error}>{failure(create.error)}</Text> : null}
      <Button title="Save" onPress={save} disabled={!draft.success || create.isPending} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.lg },
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
  error: { color: colors.error, textAlign: 'center', marginTop: spacing.sm },
})

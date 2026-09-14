import { useState } from 'react'
import { Stack } from 'expo-router'
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  createScenarioInputSchema,
  SCENARIO_CONTEXT_MAX,
  SCENARIO_NAME_MAX,
  type ChatStyle,
  type Scenario,
} from '@contracts'
import { useCreateScenario, useDeleteScenario, useScenarios, useUpdateScenario } from '../src/api/use-scenarios'
import { Chip } from '../src/components/chip'
import { colors, spacing } from '../src/theme/tokens'

const STYLES: [ChatStyle, string][] = [
  ['informal', 'informal'],
  ['formal', 'formal'],
]

type FormProps = { scenario?: Scenario; onDone: () => void }

const Form = ({ scenario, onDone }: FormProps) => {
  const [name, setName] = useState(scenario?.name ?? '')
  const [context, setContext] = useState(scenario?.context ?? '')
  const [style, setStyle] = useState<ChatStyle>(scenario?.style ?? 'informal')
  const create = useCreateScenario()
  const update = useUpdateScenario()

  const input = createScenarioInputSchema.safeParse({ name, context, style })
  const pending = create.isPending || update.isPending

  const save = () => {
    if (!input.success) return

    const done = { onSuccess: onDone }
    if (scenario) update.mutate({ id: scenario.id, ...input.data }, done)
    else create.mutate(input.data, done)
  }

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.name}
        value={name}
        onChangeText={setName}
        placeholder="Name, e.g. Scrum standup"
        placeholderTextColor={colors.muted}
        maxLength={SCENARIO_NAME_MAX}
      />
      <TextInput
        style={styles.context}
        value={context}
        onChangeText={setContext}
        placeholder="What is the situation?"
        placeholderTextColor={colors.muted}
        maxLength={SCENARIO_CONTEXT_MAX}
        multiline
      />
      <View style={styles.row}>
        {STYLES.map(([value, label]) => (
          <Chip key={value} label={label} active={style === value} onPress={() => setStyle(value)} />
        ))}
      </View>
      {create.isError || update.isError ? <Text style={styles.error}>Could not save that scenario</Text> : null}
      <View style={styles.row}>
        <Pressable
          onPress={save}
          accessibilityRole="button"
          disabled={!input.success || pending}
          style={[styles.save, (!input.success || pending) && styles.saveOff]}
        >
          <Text style={styles.saveLabel}>{pending ? 'Saving…' : 'Save'}</Text>
        </Pressable>
        <Pressable onPress={onDone} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}

type RowProps = { scenario: Scenario; onEdit: () => void; onDelete: () => void }

const Row = ({ scenario, onEdit, onDelete }: RowProps) => (
  <View style={styles.item}>
    <Pressable style={styles.itemBody} onPress={onEdit} accessibilityRole="button">
      <Text style={styles.itemName}>{scenario.name}</Text>
      <Text style={styles.itemContext} numberOfLines={2}>
        {scenario.context}
      </Text>
      <Text style={styles.itemStyle}>{scenario.style}</Text>
    </Pressable>
    <Pressable
      onPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel={`Delete ${scenario.name}`}
      hitSlop={8}
      style={styles.remove}
    >
      <Text style={styles.removeIcon}>×</Text>
    </Pressable>
  </View>
)

export default function Scenarios() {
  const scenarios = useScenarios()
  const remove = useDeleteScenario()
  const [editing, setEditing] = useState<Scenario | 'new'>()

  const confirmDelete = ({ id, name }: Scenario) =>
    Alert.alert(`Delete ${name}?`, 'Chats you already started from it keep their situation.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(id) },
    ])

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Scenarios' }} />
      {editing ? (
        <Form
          key={editing === 'new' ? 'new' : editing.id}
          scenario={editing === 'new' ? undefined : editing}
          onDone={() => setEditing(undefined)}
        />
      ) : (
        <Pressable onPress={() => setEditing('new')} accessibilityRole="button" style={styles.add}>
          <Text style={styles.addLabel}>New scenario</Text>
        </Pressable>
      )}
      {scenarios.isPending ? <ActivityIndicator style={styles.state} /> : null}
      {scenarios.isError ? <Text style={styles.error}>Could not load your scenarios</Text> : null}
      {remove.isError ? <Text style={styles.error}>Could not delete that scenario</Text> : null}
      <FlatList
        data={scenarios.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Row scenario={item} onEdit={() => setEditing(item)} onDelete={() => confirmDelete(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.sm },
  form: { gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, fontSize: 16 },
  context: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, minHeight: 72 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  save: { backgroundColor: colors.ok, borderRadius: 8, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  saveOff: { opacity: 0.4 },
  saveLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancel: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  cancelLabel: { color: colors.muted, fontSize: 15 },
  add: { paddingVertical: spacing.sm, alignItems: 'center' },
  addLabel: { color: colors.ok, fontSize: 15, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  itemBody: { flex: 1, gap: 2 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemContext: { color: colors.muted },
  itemStyle: { color: colors.muted, fontSize: 12 },
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
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, paddingVertical: spacing.sm },
})

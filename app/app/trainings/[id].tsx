import { Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { ChatMessage } from '@contracts'
import { useTraining } from '../../src/api/use-training'
import { colors, spacing } from '../../src/theme/tokens'

const Bubble = ({ message }: { message: ChatMessage }) => (
  <View style={[styles.bubble, message.role === 'user' ? styles.mine : styles.theirs]}>
    <Text style={styles.bubbleText}>{message.content}</Text>
  </View>
)

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const training = useTraining(id)

  if (training.isPending) return <ActivityIndicator style={styles.state} />
  if (training.isError) return <Text style={styles.error}>Could not open this conversation</Text>

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: training.data.context }} />
      <View style={styles.chips}>
        {training.data.targets.map((target) => (
          <View key={target.expressionId} style={styles.chip}>
            <Text style={styles.chipLabel}>{target.expression}</Text>
          </View>
        ))}
      </View>
      <FlatList
        data={training.data.messages}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => <Bubble message={item} />}
        contentContainerStyle={styles.messages}
      />
      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={styles.input}
          placeholder="Replying comes next"
          placeholderTextColor={colors.muted}
          editable={false}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  chipLabel: { fontSize: 13, color: colors.muted },
  messages: { padding: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: spacing.sm + 2 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#eef0f3' },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.ok },
  bubbleText: { fontSize: 15 },
  composer: { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

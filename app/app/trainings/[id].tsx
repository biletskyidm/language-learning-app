import { useRef, useState } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { ChatMessage, TrainingTarget } from '@contracts'
import { useSendMessage } from '../../src/api/use-send-message'
import { useTraining } from '../../src/api/use-training'
import { AssessmentPreview } from '../../src/components/assessment-preview'
import { MessageBubble } from '../../src/components/message-bubble'
import { TargetChips } from '../../src/components/target-chips'
import { TargetProgress } from '../../src/components/target-progress'
import { TypingIndicator } from '../../src/components/typing-indicator'
import { colors, spacing } from '../../src/theme/tokens'

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const training = useTraining(id)
  const send = useSendMessage(id)
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState<ChatMessage | null>(null)
  const [progress, setProgress] = useState<TrainingTarget | null>(null)
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT)
  const list = useRef<FlatList<ChatMessage>>(null)

  if (training.isPending) return <ActivityIndicator style={styles.state} />
  if (training.isError) return <Text style={styles.error}>Could not open this conversation</Text>

  const messages: ChatMessage[] =
    send.isPending && send.variables
      ? [...training.data.messages, { role: 'user', content: send.variables, createdAt: new Date() }]
      : training.data.messages

  const submit = () => {
    const content = draft.trim()
    if (!content || send.isPending) return

    setDraft('')
    setInputHeight(INPUT_MIN_HEIGHT)
    send.mutate(content, { onError: () => setDraft((current) => current || content) })
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <Stack.Screen options={{ title: training.data.context }} />
      <TargetChips targets={training.data.targets} messages={messages} onPress={setProgress} />
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => <MessageBubble message={item} onPreview={() => setPreview(item)} />}
        contentContainerStyle={styles.messages}
        ListFooterComponent={send.isPending ? <TypingIndicator /> : null}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
      />
      {send.isError ? <Text style={styles.error}>Could not send that — try again</Text> : null}
      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={[styles.input, { height: inputHeight }]}
          value={draft}
          onChangeText={setDraft}
          onContentSizeChange={(event) =>
            setInputHeight(
              Math.min(INPUT_MAX_HEIGHT, Math.max(INPUT_MIN_HEIGHT, event.nativeEvent.contentSize.height)),
            )
          }
          placeholder="Say something"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={submit}
          disabled={!draft.trim() || send.isPending}
          style={[styles.send, (!draft.trim() || send.isPending) && styles.sendOff]}
        >
          <Text style={styles.sendLabel}>Send</Text>
        </Pressable>
      </View>
      {preview?.assessment ? (
        <AssessmentPreview assessment={preview.assessment} onDismiss={() => setPreview(null)} />
      ) : null}
      {progress ? (
        <TargetProgress target={progress} effects={training.data.srsEffects} onDismiss={() => setProgress(null)} />
      ) : null}
    </KeyboardAvoidingView>
  )
}

const INPUT_MIN_HEIGHT = 40
const INPUT_MAX_HEIGHT = 120

const styles = StyleSheet.create({
  container: { flex: 1 },
  messages: { padding: spacing.md, gap: spacing.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  send: {
    minWidth: 64,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: colors.ok,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sendOff: { opacity: 0.4 },
  sendLabel: { color: '#fff', fontWeight: '600' },
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.sm },
})

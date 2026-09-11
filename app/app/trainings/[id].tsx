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
import { useCompleteTraining } from '../../src/api/use-complete-training'
import { useSendMessage } from '../../src/api/use-send-message'
import { useTraining } from '../../src/api/use-training'
import { readyToEnd } from '../../src/components/assessment'
import { AssessmentPreview } from '../../src/components/assessment-preview'
import { MessageBubble } from '../../src/components/message-bubble'
import { SessionSummary } from '../../src/components/session-summary'
import { TargetChips } from '../../src/components/target-chips'
import { TargetProgress } from '../../src/components/target-progress'
import { TypingIndicator } from '../../src/components/typing-indicator'
import { colors, spacing } from '../../src/theme/tokens'

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const training = useTraining(id)
  const send = useSendMessage(id)
  const complete = useCompleteTraining(id)
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

  const { status, targets, finalAssessment } = training.data
  const active = status === 'ACTIVE'
  const canEnd = active && !send.isPending && !complete.isPending
  const end = () => {
    if (canEnd) complete.mutate()
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <Stack.Screen
        options={{
          title: training.data.context,
          headerRight: active
            ? () => (
                <Pressable onPress={end} disabled={!canEnd} accessibilityRole="button">
                  <Text style={[styles.headerAction, !canEnd && styles.sendOff]}>End session</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <TargetChips targets={targets} messages={messages} onPress={setProgress} />
      {finalAssessment ? <SessionSummary finalAssessment={finalAssessment} /> : null}
      {active && readyToEnd(targets, messages) ? (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>Every target landed. Ready to wrap up?</Text>
          <Pressable
            onPress={end}
            disabled={!canEnd}
            style={[styles.nudgeButton, !canEnd && styles.sendOff]}
            accessibilityRole="button"
          >
            <Text style={styles.sendLabel}>End session</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => <MessageBubble message={item} onPreview={() => setPreview(item)} />}
        contentContainerStyle={[styles.messages, !active && { paddingBottom: insets.bottom + spacing.md }]}
        ListFooterComponent={send.isPending ? <TypingIndicator /> : null}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
      />
      {complete.isPending ? <ActivityIndicator style={styles.state} /> : null}
      {complete.isError ? <Text style={styles.error}>Could not end the session — try again</Text> : null}
      {send.isError ? <Text style={styles.error}>Could not send that — try again</Text> : null}
      {active ? (
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
      ) : null}
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
  headerAction: { color: colors.error, fontSize: 16, fontWeight: '600' },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#e7f4ea',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nudgeText: { flex: 1, color: colors.ok, fontWeight: '600' },
  nudgeButton: {
    borderRadius: 16,
    backgroundColor: colors.ok,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.sm },
})

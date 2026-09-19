import { useState } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { ChatMessage, ChatTraining } from '@contracts'
import { useTraining } from '../../../src/api/use-training'
import { AssessmentPreview } from '../../../src/components/assessment-preview'
import { DrillRounds } from '../../../src/components/drill-rounds'
import { MessageBubble } from '../../../src/components/message-bubble'
import { SessionSummary } from '../../../src/components/session-summary'
import { SrsEffects } from '../../../src/components/srs-effects'
import { TRAINING_STATUS_NAMES, TRAINING_TYPE_NAMES } from '../../../src/components/training-row'
import { colors, spacing } from '../../../src/theme/tokens'

const ChatPast = ({ chat, onPreview }: { chat: ChatTraining; onPreview: (message: ChatMessage) => void }) => (
  <>
    {chat.finalAssessment ? <SessionSummary finalAssessment={chat.finalAssessment} /> : null}
    <View style={styles.messages}>
      {chat.messages.map((message, index) => (
        <MessageBubble key={index} message={message} onPreview={() => onPreview(message)} />
      ))}
    </View>
  </>
)

export default function PastTraining() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const training = useTraining(id)
  const [preview, setPreview] = useState<ChatMessage | null>(null)

  const past = training.data
  const title = past ? (past.type === 'chat' ? past.context : TRAINING_TYPE_NAMES[past.type]) : 'Session'

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      {training.isPending ? <ActivityIndicator style={styles.state} /> : null}
      {training.isError ? <Text style={styles.error}>Could not open this session</Text> : null}
      {past ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.when}>
            {TRAINING_STATUS_NAMES[past.status]} ·{' '}
            {(past.canceledAt ?? past.completedAt ?? past.createdAt).toLocaleDateString()}
          </Text>
          {past.type !== 'chat' && past.aggregates ? (
            <Text style={styles.summary}>
              {past.aggregates.rounds} rounds · {past.aggregates.correct} right · {past.aggregates.wrong} wrong
            </Text>
          ) : null}
          {past.type === 'chat' ? <ChatPast chat={past} onPreview={setPreview} /> : <DrillRounds training={past} />}
          <SrsEffects effects={past.srsEffects} />
        </ScrollView>
      ) : null}
      {preview?.assessment ? (
        <AssessmentPreview assessment={preview.assessment} onDismiss={() => setPreview(null)} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: spacing.md, gap: spacing.md },
  messages: { gap: spacing.sm },
  when: { color: colors.muted, fontSize: 12 },
  summary: { fontWeight: '600' },
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})

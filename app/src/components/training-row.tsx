import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { FinalAssessmentAverages, TrainingStatus, TrainingSummary, TrainingType } from '@contracts'
import { colors, spacing } from '../theme/tokens'

export const TRAINING_TYPE_NAMES: Record<TrainingType, string> = {
  chat: 'Chat',
  gaps: 'Gaps',
  describe: 'Describe-it',
  smuggle: 'Smuggle',
}

export const TRAINING_STATUS_NAMES: Record<TrainingStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled',
}

const TYPE_ICONS: Record<TrainingType, string> = { chat: '💬', gaps: '🧩', describe: '🗣️', smuggle: '🎒' }

const AVERAGE_LABELS: [keyof FinalAssessmentAverages, string][] = [
  ['contextCorrectness', 'Context'],
  ['grammarAndSyntax', 'Grammar'],
  ['vocabularyDiversity', 'Vocabulary'],
  ['sentenceComplexity', 'Complexity'],
  ['sentenceNaturalness', 'Naturalness'],
]

export const TrainingRow = ({ training }: { training: TrainingSummary }) => {
  const resumable = training.type === 'chat' && training.status === 'ACTIVE'
  const averages = training.finalAssessment?.averages

  return (
    <Pressable
      style={styles.row}
      disabled={!resumable}
      onPress={() => router.push(`/trainings/${training.id}`)}
      accessibilityRole={resumable ? 'button' : undefined}
    >
      <Text style={styles.icon}>{TYPE_ICONS[training.type]}</Text>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {training.context ?? TRAINING_TYPE_NAMES[training.type]}
        </Text>
        <Text style={styles.meta}>
          <Text style={resumable ? styles.active : undefined}>{TRAINING_STATUS_NAMES[training.status]}</Text> ·{' '}
          {training.createdAt.toLocaleDateString()}
        </Text>
        {averages ? (
          <Text style={styles.meta}>
            {AVERAGE_LABELS.map(([key, label]) => `${label} ${averages[key].toFixed(1)}`).join(' · ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  icon: { fontSize: 22 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12 },
  active: { color: colors.ok, fontWeight: '600' },
})

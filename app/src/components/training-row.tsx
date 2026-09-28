import { Fragment } from 'react'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from './themed'
import type { TrainingStatus, TrainingSummary, TrainingType } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { AveragesLine } from './averages-line'
import { Score } from './score'
import { trainingRoute } from './training-route'

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

export const TrainingRow = ({ training, onMenu }: { training: TrainingSummary; onMenu?: () => void }) => {
  const route = trainingRoute(training.type, training.id, training.status)
  const openable = route !== undefined
  const resumable = openable && training.status === 'ACTIVE'
  const { scores } = training
  const averages = training.finalAssessment?.averages

  return (
    <Pressable
      style={styles.row}
      disabled={!openable}
      onPress={() => route && router.push(route)}
      accessibilityRole={openable ? 'button' : undefined}
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
        {averages ? <AveragesLine averages={averages} style={styles.meta} /> : null}
        {scores?.length ? (
          <Text style={styles.meta}>
            Score:{' '}
            {scores.map((score, index) => (
              <Fragment key={index}>
                {index > 0 ? ' · ' : ''}
                <Score value={score} digits={0} style={styles.meta} />
              </Fragment>
            ))}
          </Text>
        ) : null}
      </View>
      {onMenu && training.status === 'ACTIVE' ? (
        <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel="Session menu" hitSlop={12}>
          <Text style={styles.menu}>⋯</Text>
        </Pressable>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  icon: { fontSize: 22 },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12 },
  active: { color: colors.ok, fontWeight: '600' },
  menu: { fontSize: 22, color: colors.muted, paddingHorizontal: spacing.sm },
})

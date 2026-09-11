import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { SrsEffect, TrainingTarget } from '@contracts'
import { colors, spacing } from '../theme/tokens'

type Props = { target: TrainingTarget; effects: SrsEffect[]; onDismiss: () => void }

export const TargetProgress = ({ target, effects, onDismiss }: Props) => {
  const own = effects.filter((effect) => effect.expressionId === target.expressionId)
  const first = own[0]
  const last = own[own.length - 1]
  const before = first?.before.score === undefined ? 'new' : first.before.score.toFixed(1)

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss progress"
      />
      <View style={styles.card}>
        <Text style={styles.expression}>{target.expression}</Text>
        {last ? (
          <>
            <View style={styles.row} accessibilityLabel={`Score: ${before} to ${last.after.score.toFixed(1)}`}>
              <Text style={styles.label}>Score</Text>
              <Text style={styles.before}>{before}</Text>
              <Text style={styles.before}>→</Text>
              <Text style={styles.after}>{last.after.score.toFixed(1)}</Text>
            </View>
            <View style={styles.row} accessibilityLabel={`Practiced ${last.after.timesPracticed} times`}>
              <Text style={styles.label}>Practiced</Text>
              <Text style={styles.after}>{`${last.after.timesPracticed}×`}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.empty}>Not scored in this chat yet</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  card: {
    gap: spacing.sm,
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  expression: { fontWeight: '700', fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 80, color: colors.muted, fontSize: 15 },
  before: { color: colors.muted, fontSize: 15 },
  after: { fontSize: 15, fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 15 },
})

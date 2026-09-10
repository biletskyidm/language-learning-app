import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { SrsEffect } from '@contracts'
import { colors, spacing } from '../theme/tokens'

const NEVER = 'never'

const day = (date?: Date) => (date ? date.toISOString().slice(0, 10) : NEVER)
const score = (value?: number) => (value === undefined ? NEVER : value.toFixed(1))
const count = (value?: number) => (value === undefined ? NEVER : String(value))

const Row = ({ label, before, after }: { label: string; before: string; after: string }) => (
  <View style={styles.row} accessibilityLabel={`${label}: ${before} to ${after}`}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.before}>{before}</Text>
    <Text style={styles.arrow}>→</Text>
    <Text style={styles.after}>{after}</Text>
  </View>
)

type Props = { effects: SrsEffect[]; onDismiss: () => void }

export const SrsEffectsSheet = ({ effects, onDismiss }: Props) => (
  <View style={styles.backdrop}>
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel="Dismiss effects"
    />
    <View style={styles.card}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {effects.length ? (
          effects.map((effect, index) => (
            <View key={`${effect.expressionId}-${index}`} testID="srs-effect" style={styles.effect}>
              <View style={styles.head}>
                <Text style={styles.expression}>{effect.expression}</Text>
                <Text style={styles.written}>{`Scored ${effect.scoreWritten}`}</Text>
              </View>
              <Row label="Score" before={score(effect.before.score)} after={score(effect.after.score)} />
              <Row
                label="Practiced"
                before={count(effect.before.timesPracticed)}
                after={count(effect.after.timesPracticed)}
              />
              <Row label="Due" before={day(effect.before.nextTrainingAt)} after={day(effect.after.nextTrainingAt)} />
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Nothing scored yet</Text>
        )}
      </ScrollView>
    </View>
  </View>
)

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
    maxHeight: '92%',
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  scroll: { flexShrink: 1 },
  body: { gap: spacing.md, padding: spacing.md },
  effect: { gap: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  expression: { flexShrink: 1, fontWeight: '600', fontSize: 15 },
  written: { color: colors.ok, fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { width: 80, color: colors.muted, fontSize: 14 },
  before: { color: colors.muted, fontSize: 14 },
  arrow: { color: colors.muted, fontSize: 14 },
  after: { fontSize: 14, fontWeight: '600' },
  empty: { color: colors.muted, textAlign: 'center', fontSize: 14 },
})

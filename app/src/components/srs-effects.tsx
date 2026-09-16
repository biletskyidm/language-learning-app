import { StyleSheet, Text, View } from 'react-native'
import type { SrsEffect } from '@contracts'
import { colors, spacing } from '../theme/tokens'

const score = (value?: number) => (value === undefined ? 'new' : value.toFixed(1))

export const SrsEffects = ({ effects }: { effects: SrsEffect[] }) => (
  <View style={styles.section}>
    <Text style={styles.heading}>Effects</Text>
    {effects.length === 0 ? (
      <Text style={styles.empty}>Nothing was scored in this session.</Text>
    ) : (
      effects.map((effect, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.expression} numberOfLines={1}>
            {effect.expression}
          </Text>
          <Text style={styles.meta}>
            scored {effect.scoreWritten} · {score(effect.before.score)} → {score(effect.after.score)} ·{' '}
            {effect.after.timesPracticed}× · due {effect.after.nextTrainingAt.toLocaleDateString()}
          </Text>
        </View>
      ))
    )}
  </View>
)

const styles = StyleSheet.create({
  section: { gap: spacing.sm, paddingTop: spacing.sm },
  heading: { fontSize: 16, fontWeight: '600' },
  empty: { color: colors.muted },
  row: { gap: 2 },
  expression: { fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12 },
})

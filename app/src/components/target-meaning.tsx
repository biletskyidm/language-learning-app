import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from './themed'
import type { TrainingTarget } from '@contracts'
import { colors, spacing } from '../theme/tokens'

type Props = { target: TrainingTarget; onDismiss: () => void }

export const TargetMeaning = ({ target, onDismiss }: Props) => (
  <View style={styles.backdrop}>
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel="Dismiss meaning"
    />
    <View style={styles.card}>
      <Text style={styles.expression}>{target.expression}</Text>
      <Text style={styles.meaning}>{target.meaning}</Text>
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
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  card: {
    gap: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  expression: { fontWeight: '700', fontSize: 17 },
  meaning: { fontSize: 15, lineHeight: 22 },
})

import { Pressable, StyleSheet, type ColorValue } from 'react-native'
import { Text } from './themed'
import { Skeleton } from './skeleton'
import { colors } from '../theme/tokens'

type Props = { label: string; count?: number; total?: number; tint?: ColorValue; onPress?: () => void }

export const CountTile = ({ label, count, total, tint = colors.text, onPress }: Props) => (
  <Pressable
    style={styles.tile}
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={count === undefined ? label : `${label}: ${count} of ${total}`}
  >
    {count === undefined ? (
      <Skeleton width={40} height={34} />
    ) : (
      <Text style={[styles.count, { color: tint }]}>
        {count}
        <Text style={styles.total}> / {total}</Text>
      </Text>
    )}
    <Text style={styles.label}>{label}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: colors.bubble, borderRadius: 14, padding: 14, gap: 4 },
  count: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
  total: { fontSize: 18, fontWeight: '500', color: colors.muted },
  label: { fontSize: 12, color: colors.muted },
})

import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from './themed'
import { colors, spacing } from '../theme/tokens'

export type ModeTile<M extends string> = { mode: M; emoji: string; name: string; blurb: string }

type Props<M extends string> = { modes: ModeTile<M>[]; selected: M; onSelect: (mode: M) => void }

export const ModeTiles = <M extends string>({ modes, selected, onSelect }: Props<M>) => (
  <View style={styles.tiles}>
    {modes.map(({ mode, emoji, name, blurb }) => {
      const active = mode === selected

      return (
        <Pressable
          key={mode}
          onPress={() => onSelect(mode)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          style={[styles.tile, active && styles.tileActive]}
        >
          <View style={styles.head}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.name}>{name}</Text>
          </View>
          <Text style={styles.blurb}>{blurb}</Text>
        </Pressable>
      )
    })}
  </View>
)

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: spacing.sm + 2,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tileActive: { borderColor: colors.ok, backgroundColor: colors.okSoft },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emoji: { fontSize: 18 },
  name: { fontSize: 15, fontWeight: '600' },
  blurb: { fontSize: 11, color: colors.muted, lineHeight: 14 },
})

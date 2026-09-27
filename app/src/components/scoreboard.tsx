import { useRef, useState, type ReactNode } from 'react'
import { Animated, StyleSheet, useColorScheme, View } from 'react-native'
import { colors, palettes, spacing } from '../theme/tokens'
import { Score } from './score'
import { ScoreBar } from './score-bar'
import { Text } from './themed'

const FADE = 40

export const FadeScroll = ({ children }: { children: ReactNode }) => {
  const surface = palettes[useColorScheme() === 'dark' ? 'dark' : 'light'].surface
  const y = useRef(new Animated.Value(0)).current
  const [size, setSize] = useState({ view: 0, content: 0 })
  const max = Math.max(0, size.content - size.view)

  return (
    <View style={styles.fadeWrap}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={scoreboard.body}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
        onLayout={({ nativeEvent: { layout } }) => setSize((current) => ({ ...current, view: layout.height }))}
        onContentSizeChange={(_, content) => setSize((current) => ({ ...current, content }))}
      >
        {children}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fade,
          {
            top: 0,
            experimental_backgroundImage: `linear-gradient(to bottom, ${surface}, ${surface}00)`,
            opacity: y.interpolate({ inputRange: [0, FADE], outputRange: [0, 1], extrapolate: 'clamp' }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fade,
          {
            bottom: 0,
            experimental_backgroundImage: `linear-gradient(to top, ${surface}, ${surface}00)`,
            opacity:
              max === 0
                ? 0
                : y.interpolate({ inputRange: [max - FADE, max], outputRange: [1, 0], extrapolate: 'clamp' }),
          },
        ]}
      />
    </View>
  )
}

type ScoreLineProps = { label: string; score: number; open?: boolean }

export const ScoreLine = ({ label, score, open }: ScoreLineProps) => (
  <View style={styles.line}>
    <Text style={styles.label} numberOfLines={2}>
      {label}
    </Text>
    <View style={styles.bar}>
      <ScoreBar score={score} />
    </View>
    <Score value={score} digits={0} style={styles.score} />
    {open === undefined ? null : <Text style={styles.toggle}>{open ? '−' : '+'}</Text>}
  </View>
)

export const scoreboard = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  body: { paddingHorizontal: spacing.md, paddingBottom: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: spacing.md, paddingBottom: 12 },
  heroScore: { fontSize: 34, fontWeight: '800' },
  section: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', paddingTop: 12, paddingBottom: 2 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  text: { fontSize: 13, lineHeight: 18 },
})

const styles = StyleSheet.create({
  fadeWrap: { flexShrink: 1 },
  scroll: { flexGrow: 0 },
  fade: { position: 'absolute', left: 0, right: 0, height: FADE },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  label: { width: 120, fontSize: 14, fontWeight: '600' },
  bar: { flex: 1 },
  score: { width: 22, textAlign: 'right', fontSize: 14, fontWeight: '800' },
  toggle: { width: 14, textAlign: 'center', fontSize: 16, color: colors.muted },
})

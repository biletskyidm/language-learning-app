import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { colors, spacing } from '../theme/tokens'

const RISE = 300
const CYCLE = 1200
const STAGGER = 160

/** Each dot runs the same 1.2s cycle, offset by its start delay, so the three read as one wave. */
const Dot = ({ delay }: { delay: number }) => {
  const wave = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(wave, { toValue: 1, duration: RISE, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: RISE, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(CYCLE - delay - RISE * 2),
      ]),
    )

    loop.start()

    return () => loop.stop()
  }, [delay, wave])

  return (
    <Animated.View
      testID="typing-dot"
      style={[
        styles.dot,
        {
          opacity: wave.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ translateY: wave.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
        },
      ]}
    />
  )
}

export const TypingIndicator = () => (
  <View style={styles.bubble} accessibilityLabel="Tutor is typing">
    {[0, 1, 2].map((index) => (
      <Dot key={index} delay={index * STAGGER} />
    ))}
  </View>
)

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 16,
    backgroundColor: '#eef0f3',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
})

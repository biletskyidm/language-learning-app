import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import { colors } from '../theme/tokens'

const SWEEP = 1200
const FADE = [0.1, 0.25, 0.45, 0.65, 0.8, 0.65, 0.45, 0.25, 0.1]

export const Skeleton = ({
  width,
  height,
  style,
}: {
  width?: DimensionValue
  height: number
  style?: StyleProp<ViewStyle>
}) => {
  const sweep = useRef(new Animated.Value(0)).current
  const [measured, setMeasured] = useState(0)

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: SWEEP, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    )

    loop.start()

    return () => loop.stop()
  }, [sweep])

  return (
    <View
      testID="skeleton"
      style={[styles.block, { width, height, borderRadius: Math.min(6, height / 2) }, style]}
      onLayout={(event) => setMeasured(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.band,
          {
            width: Math.max(40, measured * 0.6),
            transform: [
              {
                translateX: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-Math.max(40, measured * 0.6), measured],
                }),
              },
            ],
          },
        ]}
      >
        {FADE.map((opacity, index) => (
          <View key={index} style={[styles.slice, { opacity }]} />
        ))}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  slice: { flex: 1, backgroundColor: colors.shimmer },
})

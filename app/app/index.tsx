import { StyleSheet, Text, View } from 'react-native'
import { useHealth } from '../src/api/use-health'
import { colors, spacing } from '../src/theme/tokens'

const label = (status: 'pending' | 'error' | 'success', db?: 'ok' | 'down') => {
  if (status === 'pending') return 'API: …'
  if (status === 'error') return 'API: unreachable'
  return db === 'ok' ? 'API: ok' : 'API: db down'
}

export default function Home() {
  const { status, data } = useHealth()
  const healthy = status === 'success' && data?.db === 'ok'

  return (
    <View style={styles.container}>
      <Text style={[styles.status, { color: healthy ? colors.ok : colors.error }]}>
        {label(status, data?.db)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  status: { fontSize: 18, fontWeight: '600' },
})

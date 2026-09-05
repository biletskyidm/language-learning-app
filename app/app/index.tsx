import { Redirect, router } from 'expo-router'
import { Button, StyleSheet, Text, View } from 'react-native'
import { UnauthorizedError } from '../src/api/client'
import { useCredentials } from '../src/api/use-credentials'
import { useHealth } from '../src/api/use-health'
import { colors, spacing } from '../src/theme/tokens'

export default function Home() {
  const credentials = useCredentials()
  const health = useHealth(credentials.data != null)

  if (credentials.isPending) return <View style={styles.container} />
  if (!credentials.data) return <Redirect href="/setup" />

  const rejected = health.error instanceof UnauthorizedError
  const healthy = health.isSuccess && health.data.db === 'ok'

  const label = () => {
    if (rejected) return 'Check your secret'
    if (health.isPending) return 'API: …'
    if (health.isError) return 'API: unreachable'
    return healthy ? 'API: ok' : 'API: db down'
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.status, { color: healthy ? colors.ok : colors.error }]}>{label()}</Text>
      {rejected ? <Button title="Change API URL or secret" onPress={() => router.push('/setup')} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  status: { fontSize: 18, fontWeight: '600' },
})

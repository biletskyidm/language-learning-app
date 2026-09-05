import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Button, StyleSheet, Text, TextInput, View } from 'react-native'
import { saveCredentials } from '../src/api/credentials'
import { CREDENTIALS_KEY } from '../src/api/use-credentials'
import { colors, spacing } from '../src/theme/tokens'

export default function Setup() {
  const [baseUrl, setBaseUrl] = useState('')
  const [secret, setSecret] = useState('')
  const queryClient = useQueryClient()

  // Seeded, not invalidated: Home would bounce back here on the stale null mid-refetch.
  const save = async () => {
    queryClient.setQueryData(CREDENTIALS_KEY, await saveCredentials({ baseUrl, secret }))
    router.replace('/')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Point the app at your API and paste the shared secret. Both stay in the device keychain.</Text>

      <Text style={styles.label}>API URL</Text>
      <TextInput
        style={styles.input}
        value={baseUrl}
        onChangeText={setBaseUrl}
        placeholder="http://192.168.1.10:8787"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Text style={styles.label}>Shared secret</Text>
      <TextInput
        style={styles.input}
        value={secret}
        onChangeText={setSecret}
        placeholder="openssl rand -hex 32"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      <Button title="Save" onPress={save} disabled={!baseUrl.trim() || !secret.trim()} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.md, gap: spacing.sm },
  hint: { color: colors.muted, marginBottom: spacing.md },
  label: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
})

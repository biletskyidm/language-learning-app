import { useCallback } from 'react'
import { Redirect, router, useFocusEffect } from 'expo-router'
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { UnauthorizedError } from '../src/api/client'
import { useCredentials } from '../src/api/use-credentials'
import { useHealth } from '../src/api/use-health'
import { useProgressSummary } from '../src/api/use-progress-summary'
import { TrainingRow } from '../src/components/training-row'
import { colors, spacing } from '../src/theme/tokens'

const START: [string, string][] = [
  ['New chat', 'chat'],
  ['Gaps', 'gaps'],
  ['Describe', 'describe'],
  ['Smuggle', 'smuggle'],
]

export default function Home() {
  const credentials = useCredentials()
  const configured = credentials.data != null
  const health = useHealth(configured)
  const summary = useProgressSummary(configured)
  const { refetch } = summary

  useFocusEffect(
    useCallback(() => {
      if (configured) void refetch()
    }, [configured, refetch]),
  )

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

  const progress = () => {
    if (summary.isPending) return <Text style={styles.muted}>…</Text>
    if (summary.isError) return <Text style={styles.error}>Could not load your progress</Text>

    return (
      <>
        <Pressable onPress={() => router.push({ pathname: '/expressions', params: { due: 'true' } })}>
          <Text style={styles.due}>{summary.data.dueNow} due today</Text>
        </Pressable>
        <Text style={styles.muted}>{summary.data.unpracticed} never practiced</Text>
      </>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.status, { color: healthy ? colors.ok : colors.error }]}>{label()}</Text>
      {rejected ? <Button title="Change API URL or secret" onPress={() => router.push('/setup')} /> : null}
      <View style={styles.section}>{progress()}</View>
      <View style={styles.start}>
        {START.map(([title, mode]) => (
          <Button key={mode} title={title} onPress={() => router.push({ pathname: '/practice', params: { mode } })} />
        ))}
      </View>
      <View style={styles.sessions}>
        <Text style={styles.heading}>Active sessions</Text>
        {summary.data?.active.length === 0 ? <Text style={styles.muted}>No active sessions</Text> : null}
        {summary.data?.active.map((training) => (
          <TrainingRow key={training.id} training={training} />
        ))}
      </View>
      <Button title="Vocabulary" onPress={() => router.push('/expressions')} />
      <Button title="Sessions" onPress={() => router.push('/trainings')} />
      <Button title="Settings" onPress={() => router.push('/settings')} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  status: { fontSize: 18, fontWeight: '600' },
  section: { alignItems: 'center', gap: 4 },
  due: { fontSize: 28, fontWeight: '700' },
  muted: { color: colors.muted },
  error: { color: colors.error },
  start: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  sessions: { alignSelf: 'stretch', gap: spacing.sm },
  heading: { fontSize: 16, fontWeight: '600' },
})

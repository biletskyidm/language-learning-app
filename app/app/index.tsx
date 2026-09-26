import { useCallback } from 'react'
import { Redirect, Stack, router, useFocusEffect } from 'expo-router'
import { Button, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../src/components/themed'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DEFAULT_SETTINGS } from '@contracts'
import { UnauthorizedError } from '../src/api/client'
import { useCredentials } from '../src/api/use-credentials'
import { useProgressSummary } from '../src/api/use-progress-summary'
import { useSettings } from '../src/api/use-settings'
import { Card, cardStyles } from '../src/components/card'
import { ChatSkills } from '../src/components/chat-skills'
import { CountTile } from '../src/components/count-tile'
import { openPracticeSheet } from '../src/components/practice-sheet'
import { Score } from '../src/components/score'
import { ScoreBar } from '../src/components/score-bar'
import { ScoreTrendChart } from '../src/components/score-trend-chart'
import { TrainingRow } from '../src/components/training-row'
import { WeekChart } from '../src/components/week-chart'
import { colors, spacing } from '../src/theme/tokens'

export default function Home() {
  const insets = useSafeAreaInsets()
  const credentials = useCredentials()
  const configured = credentials.data != null
  const summary = useProgressSummary(configured)
  const settings = useSettings().data ?? DEFAULT_SETTINGS
  const { refetch } = summary

  useFocusEffect(
    useCallback(() => {
      if (configured) void refetch()
    }, [configured, refetch]),
  )

  if (credentials.isPending) return <View style={styles.screen} />
  if (!credentials.data) return <Redirect href="/setup" />

  const rejected = summary.error instanceof UnauthorizedError
  const data = summary.data
  const practice = () =>
    openPracticeSheet(settings, (mode) => router.push({ pathname: '/practice', params: { mode } }))

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="gearshape" onPress={() => router.push('/settings')} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="books.vertical" onPress={() => router.push('/expressions')} />
        <Stack.Toolbar.Button icon="clock.arrow.circlepath" onPress={() => router.push('/trainings')} />
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}
      >
        {rejected ? <Button title="Change API URL or secret" onPress={() => router.push('/setup')} /> : null}
        {summary.isError ? (
          <Text style={styles.error}>API is not responding</Text>
        ) : (
          <>
            <View style={styles.tiles}>
              <CountTile
                label="Due today"
                count={data?.dueNow}
                total={data?.total}
                tint={colors.warn}
                onPress={() => router.push({ pathname: '/expressions', params: { due: 'true' } })}
              />
              <CountTile label="Never practiced" count={data?.unpracticed} total={data?.total} />
            </View>
            <Card>
              <WeekChart week={data?.week} today={(new Date().getDay() + 6) % 7} barHeight={90} />
            </Card>
          </>
        )}
        {data?.active.count ? (
          <Card>
            <Pressable
              style={styles.cardHeader}
              onPress={() => router.push({ pathname: '/trainings', params: { status: 'ACTIVE' } })}
            >
              <Text style={cardStyles.title}>Active sessions ({data.active.count})</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            {data.active.latest.map((training) => (
              <TrainingRow key={training.id} training={training} />
            ))}
          </Card>
        ) : null}
        {data?.weakest.length ? (
          <Card title="Weakest phrases">
            {data.weakest.map((item) => (
              <Pressable
                key={item.id}
                style={styles.weak}
                onPress={() => router.push({ pathname: '/practice', params: { expressionId: item.id } })}
              >
                <View style={styles.weakHeading}>
                  <Text style={styles.weakExpression} numberOfLines={1}>
                    {item.expression}
                  </Text>
                  <Score value={item.score} style={styles.weakScore} />
                </View>
                <ScoreBar score={item.score} />
              </Pressable>
            ))}
          </Card>
        ) : null}
        {data ? (
          <Card title="Average score · last 30 days">
            <ScoreTrendChart trend={data.scoreTrend} />
          </Card>
        ) : null}
        {data?.chatSkills.averages ? (
          <Card title={`Chat skills · ${data.chatSkills.sessions} ${data.chatSkills.sessions === 1 ? 'session' : 'sessions'}`}>
            <ChatSkills averages={data.chatSkills.averages} />
          </Card>
        ) : null}
      </ScrollView>
      <View pointerEvents="box-none" style={[styles.practiceWrap, { bottom: insets.bottom + 24 }]}>
        <Pressable style={styles.practice} onPress={practice} accessibilityRole="button">
          <Text style={styles.practiceLabel}>▶︎  Practice</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.md },
  error: { color: colors.error },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 22, color: colors.muted },
  weak: { gap: 4 },
  weakHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  weakExpression: { flex: 1 },
  weakScore: { fontSize: 12 },
  practiceWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  practice: {
    backgroundColor: colors.ok,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  practiceLabel: { color: colors.onAccent, fontSize: 17, fontWeight: '700' },
})

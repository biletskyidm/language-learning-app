import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { ChatMessage } from '@contracts'
import { colors, spacing } from '../theme/tokens'
import { badgeTone, overallScore } from './assessment'
import { toneColor } from './assessment-preview'

type Props = { message: ChatMessage; onPreview?: () => void }

export const MessageBubble = ({ message, onPreview }: Props) => {
  const assessment = message.role === 'user' ? message.assessment : undefined
  const score = assessment ? overallScore(assessment) : 0

  return (
    <Pressable
      testID={assessment ? 'assessed-message' : undefined}
      onLongPress={assessment ? onPreview : undefined}
      disabled={!assessment}
      delayLongPress={250}
      accessibilityHint={assessment ? 'Press and hold to see the assessment' : undefined}
      style={message.role === 'user' ? styles.mine : styles.theirs}
    >
      <View style={[styles.bubble, message.role === 'user' ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, message.role === 'user' ? styles.bubbleTextMine : null]}>
          {message.content}
        </Text>
      </View>
      {assessment ? (
        <View style={[styles.badge, { borderColor: toneColor[badgeTone(score)] }]}>
          <Text style={[styles.badgeLabel, { color: toneColor[badgeTone(score)] }]}>
            {score.toFixed(1)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '85%', gap: 4 },
  theirs: { alignSelf: 'flex-start', maxWidth: '85%' },
  bubble: { borderRadius: 16, padding: spacing.sm + 2 },
  bubbleTheirs: { backgroundColor: '#d5d9e0' },
  bubbleMine: { backgroundColor: colors.ok },
  bubbleText: { fontSize: 15 },
  bubbleTextMine: { color: '#fff' },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeLabel: { fontSize: 12, fontWeight: '700' },
})

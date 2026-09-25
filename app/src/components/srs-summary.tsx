import { type StyleProp, type TextStyle } from 'react-native'
import { Text } from './themed'
import type { Expression } from '@contracts'
import { shortDate } from '../api/expression-srs'
import { Score } from './score'

type Props = { expression: Expression; now: Date; style?: StyleProp<TextStyle> }

export const SrsSummary = ({ expression, now, style }: Props) => {
  if (expression.score === undefined) {
    return <Text style={style}>New · {expression.frequency.replace('_', ' ')}</Text>
  }

  const due = expression.nextTrainingAt

  return (
    <Text style={style}>
      Score <Score value={expression.score} style={style} /> · Trained {expression.timesPracticed ?? 0}×
      {due ? ` · Due ${shortDate(due, now)}` : ''}
    </Text>
  )
}

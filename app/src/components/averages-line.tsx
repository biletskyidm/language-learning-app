import { Fragment } from 'react'
import { type StyleProp, type TextStyle } from 'react-native'
import { Text } from './themed'
import type { FinalAssessmentAverages } from '@contracts'
import { Score } from './score'

const AVERAGE_LABELS: [keyof FinalAssessmentAverages, string][] = [
  ['contextCorrectness', 'Context'],
  ['grammarAndSyntax', 'Grammar'],
  ['vocabularyDiversity', 'Vocabulary'],
  ['sentenceComplexity', 'Complexity'],
  ['sentenceNaturalness', 'Naturalness'],
]

type Props = { averages: FinalAssessmentAverages; style?: StyleProp<TextStyle> }

export const AveragesLine = ({ averages, style }: Props) => (
  <Text style={style}>
    {AVERAGE_LABELS.map(([key, label], index) => (
      <Fragment key={key}>
        {index > 0 ? ' · ' : ''}
        {label} <Score value={averages[key]} style={style} />
      </Fragment>
    ))}
  </Text>
)

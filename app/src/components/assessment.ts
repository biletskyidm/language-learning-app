import type { Assessment, ChatMessage, FinalAssessmentAverages, TrainingTarget } from '@contracts'

const LIT_THRESHOLD = 7

const AVERAGE_LABELS: [keyof FinalAssessmentAverages, string][] = [
  ['contextCorrectness', 'Context'],
  ['grammarAndSyntax', 'Grammar'],
  ['vocabularyDiversity', 'Vocabulary'],
  ['sentenceComplexity', 'Complexity'],
  ['sentenceNaturalness', 'Naturalness'],
]

export const overallScore = (assessment: Assessment) =>
  (assessment.contextCorrectness.score +
    assessment.grammarAndSyntax.score +
    assessment.vocabularyDiversity.score +
    assessment.sentenceComplexity.score +
    assessment.sentenceNaturalness.score) /
  5

export const badgeTone = (score: number): 'good' | 'fair' | 'poor' => {
  if (score >= LIT_THRESHOLD) return 'good'

  return score >= 4 ? 'fair' : 'poor'
}

export const litTargets = (messages: ChatMessage[]) => {
  const lit = new Set<string>()

  for (const message of messages) {
    for (const [expression, target] of Object.entries(message.assessment?.targetPhrasesCorrectness ?? {})) {
      if (target.score >= LIT_THRESHOLD) lit.add(expression)
    }
  }

  return lit
}

export const readyToEnd = (targets: TrainingTarget[], messages: ChatMessage[]) => {
  const lit = litTargets(messages)

  return targets.length > 0 && targets.every(({ expression }) => lit.has(expression))
}

export const averagesLine = (averages: FinalAssessmentAverages) =>
  AVERAGE_LABELS.map(([key, label]) => `${label} ${averages[key].toFixed(1)}`).join(' · ')

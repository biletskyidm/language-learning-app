import type { Assessment, ChatMessage } from '@contracts'

const LIT_THRESHOLD = 7

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

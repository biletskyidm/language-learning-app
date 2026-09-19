import type { Assessment, ChatMessage, TrainingTarget } from '@contracts'

const LIT_THRESHOLD = 7

export const overallScore = (assessment: Assessment) =>
  (assessment.contextCorrectness.score +
    assessment.grammarAndSyntax.score +
    assessment.vocabularyDiversity.score +
    assessment.sentenceComplexity.score +
    assessment.sentenceNaturalness.score) /
  5

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

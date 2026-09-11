import type { ChatMessage, FinalAssessment, FinalAssessmentAverages, TargetStat, TrainingTarget } from '@contracts'

export type SessionAggregate = Pick<FinalAssessment, 'averages' | 'targets'>

const USED_CORRECTLY = 7

const CATEGORIES: (keyof FinalAssessmentAverages)[] = [
  'contextCorrectness',
  'grammarAndSyntax',
  'vocabularyDiversity',
  'sentenceComplexity',
  'sentenceNaturalness',
]

const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

export const aggregateSession = (messages: ChatMessage[], targets: TrainingTarget[]): SessionAggregate => {
  const assessments = messages.flatMap(({ role, assessment }) => (role === 'user' && assessment ? [assessment] : []))

  const averages = Object.fromEntries(
    CATEGORIES.map((category) => [category, mean(assessments.map((assessment) => assessment[category].score))]),
  ) as FinalAssessmentAverages

  const stats = Object.fromEntries(
    targets.map(({ expression }): [string, TargetStat] => {
      const scores = assessments
        .map((assessment) => assessment.targetPhrasesCorrectness[expression]?.score ?? 0)
        .filter((score) => score > 0)
      const score = mean(scores)

      return [expression, { used: scores.length > 0, usedCorrectly: score >= USED_CORRECTLY, score }]
    }),
  )

  return { averages, targets: stats }
}

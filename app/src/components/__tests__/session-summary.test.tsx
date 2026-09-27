import React from 'react'
import { render, screen } from '@testing-library/react-native'
import type { FinalAssessment } from '@contracts'
import { SessionSummary } from '../session-summary'

const finalAssessment: FinalAssessment = {
  averages: {
    contextCorrectness: 5,
    grammarAndSyntax: 8,
    vocabularyDiversity: 6,
    sentenceComplexity: 4,
    sentenceNaturalness: 9,
  },
  targets: { 'break the ice': { used: true, usedCorrectly: true, score: 7 } },
  narrative: {
    strengths: 'confident opening',
    areasForImprovement: 'stay on the topic',
    suggestedFocus: 'past tenses',
  },
  computedAt: new Date('2026-09-27'),
}

describe.each([false, true])('SessionSummary capped=%s', (capped) => {
  beforeEach(() => render(<SessionSummary finalAssessment={finalAssessment} capped={capped} />))

  it('shows the mean of the averages as the overall score', () => {
    expect(screen.getByText('6.4')).toBeTruthy()
  })

  it('shows every category and target with its score', () => {
    for (const [label, score] of [
      ['Context', '5'],
      ['Grammar', '8'],
      ['Vocabulary', '6'],
      ['Complexity', '4'],
      ['Naturalness', '9'],
      ['break the ice', '7'],
    ]) {
      expect(screen.getByText(label)).toBeTruthy()
      expect(screen.getAllByText(score).length).toBeGreaterThan(0)
    }
    expect(screen.getByText('Targets')).toBeTruthy()
  })

  it('shows every narrative section', () => {
    expect(screen.getByText('Strengths')).toBeTruthy()
    expect(screen.getByText('confident opening')).toBeTruthy()
    expect(screen.getByText('To work on')).toBeTruthy()
    expect(screen.getByText('stay on the topic')).toBeTruthy()
    expect(screen.getByText('Focus next')).toBeTruthy()
    expect(screen.getByText('past tenses')).toBeTruthy()
  })

  it('has no pressable rows', () => {
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Assessment } from '@contracts'
import { AssessmentPreview } from '../assessment-preview'

const category = (score: number, feedback: string, suggestions: string) => ({ score, feedback, suggestions })

const assessment: Assessment = {
  contextCorrectness: category(5, 'you answered a different question', 'address the invitation'),
  grammarAndSyntax: category(8, 'tenses are consistent', 'I went to the shop'),
  vocabularyDiversity: category(6, 'you repeated "good"', 'vary your verbs'),
  sentenceComplexity: category(4, 'all short sentences', 'join the clauses'),
  sentenceNaturalness: category(9, 'reads naturally', 'sounds native'),
  targetPhrasesCorrectness: {
    'break the ice': {
      score: 7,
      feedback: 'nearly right',
      suggestions: 'drop the article',
      correctVersion: 'I broke the ice with a joke',
    },
  },
  overallFeedback: { strengths: 'confident opening', areasForImprovement: 'stay on the topic' },
}

const show = (onDismiss = jest.fn()) =>
  render(<AssessmentPreview assessment={assessment} onDismiss={onDismiss} />)

describe('AssessmentPreview', () => {
  it('shows every category with its score, feedback and suggestions', async () => {
    await show()

    expect(screen.getByText('Context')).toBeTruthy()
    expect(screen.getByText('Grammar')).toBeTruthy()
    expect(screen.getByText('8.0')).toBeTruthy()
    expect(screen.getByText('tenses are consistent')).toBeTruthy()
    expect(screen.getByText('I went to the shop')).toBeTruthy()
    expect(screen.getByText('Naturalness')).toBeTruthy()
  })

  it('shows the overall feedback', async () => {
    await show()

    expect(screen.getByText('confident opening')).toBeTruthy()
    expect(screen.getByText('stay on the topic')).toBeTruthy()
  })

  it('shows the attempted targets with their correct version', async () => {
    await show()

    expect(screen.getByText('break the ice')).toBeTruthy()
    expect(screen.getByText('I broke the ice with a joke')).toBeTruthy()
  })

  it('dismisses on a press outside the card', async () => {
    const onDismiss = jest.fn()
    await show(onDismiss)

    await fireEvent.press(screen.getByLabelText('Dismiss assessment'))

    expect(onDismiss).toHaveBeenCalled()
  })
})

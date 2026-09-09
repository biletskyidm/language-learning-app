import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Assessment } from '@contracts'
import { AssessmentPreview } from '../assessment-preview'

const category = (score: number, suggestion: string) => ({ score, messageWithSuggestions: suggestion })

const assessment: Assessment = {
  grammar: category(8, 'I went to the shop'),
  vocabularyDiversity: category(6, 'vary your verbs'),
  sentenceComplexity: category(4, 'join the clauses'),
  sentenceNaturalness: category(9, 'sounds native'),
  targetExpressionCorrectness: {
    'break the ice': {
      score: 7,
      messageWithSuggestions: 'nearly right',
      correctVersion: 'I broke the ice with a joke',
    },
  },
}

const show = (onDismiss = jest.fn()) =>
  render(<AssessmentPreview assessment={assessment} onDismiss={onDismiss} />)

describe('AssessmentPreview', () => {
  it('shows the four categories with their scores and suggestions', async () => {
    await show()

    expect(screen.getByText('Grammar')).toBeTruthy()
    expect(screen.getByText('8.0')).toBeTruthy()
    expect(screen.getByText('I went to the shop')).toBeTruthy()
    expect(screen.getByText('Naturalness')).toBeTruthy()
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

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

const row = (name: string) => screen.getByRole('button', { name })

describe('AssessmentPreview', () => {
  it('shows the overall score and strengths', async () => {
    await show()

    expect(screen.getByText('6.4')).toBeTruthy()
    expect(screen.getByText('confident opening')).toBeTruthy()
  })

  it('shows every category and attempted target with its score', async () => {
    await show()

    expect(row('Context 5 of 10')).toBeTruthy()
    expect(row('Grammar 8 of 10')).toBeTruthy()
    expect(row('Vocabulary 6 of 10')).toBeTruthy()
    expect(row('Complexity 4 of 10')).toBeTruthy()
    expect(row('Naturalness 9 of 10')).toBeTruthy()
    expect(row('break the ice 7 of 10')).toBeTruthy()
  })

  it('keeps feedback hidden until a row is pressed', async () => {
    await show()

    expect(screen.queryByText('tenses are consistent')).toBeNull()

    await fireEvent.press(row('Grammar 8 of 10'))

    expect(screen.getByText('tenses are consistent')).toBeTruthy()
    expect(screen.getByText(/I went to the shop/)).toBeTruthy()
    expect(row('Grammar 8 of 10').props.accessibilityState).toMatchObject({ expanded: true })
  })

  it('closes the open row when another one is pressed', async () => {
    await show()

    await fireEvent.press(row('Grammar 8 of 10'))
    await fireEvent.press(row('Context 5 of 10'))

    expect(screen.queryByText('tenses are consistent')).toBeNull()
    expect(screen.getByText('you answered a different question')).toBeTruthy()
  })

  it('closes a row pressed twice', async () => {
    await show()

    await fireEvent.press(row('Grammar 8 of 10'))
    await fireEvent.press(row('Grammar 8 of 10'))

    expect(screen.queryByText('tenses are consistent')).toBeNull()
  })

  it('shows a target correct version once its row is open', async () => {
    await show()

    expect(screen.queryByText(/I broke the ice with a joke/)).toBeNull()

    await fireEvent.press(row('break the ice 7 of 10'))

    expect(screen.getByText('nearly right')).toBeTruthy()
    expect(screen.getByText(/I broke the ice with a joke/)).toBeTruthy()
  })

  it('reveals the areas for improvement on demand', async () => {
    await show()

    expect(screen.queryByText('stay on the topic')).toBeNull()

    await fireEvent.press(row('To improve'))

    expect(screen.getByText('stay on the topic')).toBeTruthy()
  })

  it('dismisses on a press outside the card', async () => {
    const onDismiss = jest.fn()
    await show(onDismiss)

    await fireEvent.press(screen.getByLabelText('Dismiss assessment'))

    expect(onDismiss).toHaveBeenCalled()
  })
})

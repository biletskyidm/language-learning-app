import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Assessment, ChatMessage, TrainingTarget } from '@contracts'
import { TargetChips } from '../target-chips'

const targets: TrainingTarget[] = [
  { expressionId: 'e1', expression: 'break the ice', meaning: 'start a conversation' },
  { expressionId: 'e2', expression: 'under the weather', meaning: 'slightly ill' },
]

const category = (score: number) => ({ score, feedback: '', suggestions: '' })

const assessment = (targetScore: number, expression: string): Assessment => ({
  contextCorrectness: category(5),
  grammarAndSyntax: category(5),
  vocabularyDiversity: category(5),
  sentenceComplexity: category(5),
  sentenceNaturalness: category(5),
  targetPhrasesCorrectness: {
    [expression]: { ...category(targetScore), correctVersion: '' },
  },
  overallFeedback: { strengths: '', areasForImprovement: '' },
})

const message = (assessed?: Assessment): ChatMessage => ({
  role: 'user',
  content: 'hello',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  assessment: assessed,
})

describe('TargetChips', () => {
  it('starts every chip unlit', async () => {
    await render(<TargetChips targets={targets} messages={[message()]} />)

    expect(screen.getByLabelText('break the ice, not used yet')).toBeTruthy()
    expect(screen.getByLabelText('under the weather, not used yet')).toBeTruthy()
  })

  it('lights only the target used correctly', async () => {
    await render(
      <TargetChips targets={targets} messages={[message(assessment(8, 'break the ice'))]} />,
    )

    expect(screen.getByLabelText('break the ice, used correctly')).toBeTruthy()
    expect(screen.getByLabelText('under the weather, not used yet')).toBeTruthy()
  })

  it('leaves a poorly used target unlit', async () => {
    await render(
      <TargetChips targets={targets} messages={[message(assessment(3, 'break the ice'))]} />,
    )

    expect(screen.getByLabelText('break the ice, not used yet')).toBeTruthy()
  })

  it('hands the pressed target over', async () => {
    const onPress = jest.fn()
    await render(<TargetChips targets={targets} messages={[]} onPress={onPress} />)

    await fireEvent.press(screen.getByLabelText('under the weather, not used yet'))

    expect(onPress).toHaveBeenCalledWith(targets[1])
  })
})

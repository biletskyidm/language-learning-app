import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { SrsEffect, TrainingTarget } from '@contracts'
import { TargetProgress } from '../target-progress'

const target: TrainingTarget = { expressionId: 'e1', expression: 'break the ice', meaning: 'start a conversation' }

const effect = (before: number | undefined, after: number, timesPracticed: number, expressionId = 'e1'): SrsEffect => ({
  expressionId,
  expression: 'break the ice',
  scoreWritten: 8,
  source: { kind: 'message', index: 1 },
  before: { score: before, timesPracticed: timesPracticed - 1 },
  after: { score: after, timesPracticed, nextTrainingAt: new Date('2026-01-08T00:00:00.000Z') },
  at: new Date('2026-01-01T00:00:00.000Z'),
})

const show = (effects: SrsEffect[], onDismiss = jest.fn()) =>
  render(<TargetProgress target={target} effects={effects} onDismiss={onDismiss} />)

describe('TargetProgress', () => {
  it('shows how the score moved and how many times the phrase is practiced', async () => {
    await show([effect(6, 7, 3)])

    expect(screen.getByText('break the ice')).toBeTruthy()
    expect(screen.getByLabelText('Score: 6.0 to 7.0')).toBeTruthy()
    expect(screen.getByLabelText('Practiced 3 times')).toBeTruthy()
  })

  it('spans every turn of the chat: from the score it came in with to the latest', async () => {
    await show([effect(6, 7, 3), effect(7, 7.5, 4)])

    expect(screen.getByLabelText('Score: 6.0 to 7.5')).toBeTruthy()
    expect(screen.getByLabelText('Practiced 4 times')).toBeTruthy()
  })

  it('marks a phrase scored for the first time', async () => {
    await show([effect(undefined, 8, 1)])

    expect(screen.getByLabelText('Score: new to 8.0')).toBeTruthy()
  })

  it('ignores effects of other phrases', async () => {
    await show([effect(2, 3, 5, 'e2')])

    expect(screen.getByText('Not scored in this chat yet')).toBeTruthy()
  })

  it('dismisses on a press outside the card', async () => {
    const onDismiss = jest.fn()
    await show([], onDismiss)

    await fireEvent.press(screen.getByLabelText('Dismiss progress'))

    expect(onDismiss).toHaveBeenCalled()
  })
})

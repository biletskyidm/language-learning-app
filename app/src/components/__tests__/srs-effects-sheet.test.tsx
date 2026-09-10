import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { SrsEffect } from '@contracts'
import { SrsEffectsSheet } from '../srs-effects-sheet'

const effect = (overrides: Partial<SrsEffect> = {}): SrsEffect => ({
  expressionId: 'e1',
  expression: 'break the ice',
  scoreWritten: 8,
  source: { kind: 'message', index: 1 },
  before: { score: 6, timesPracticed: 2, nextTrainingAt: new Date('2026-01-01T00:00:00.000Z') },
  after: { score: 7, timesPracticed: 3, nextTrainingAt: new Date('2026-01-08T00:00:00.000Z') },
  at: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

const show = (effects: SrsEffect[], onDismiss = jest.fn()) =>
  render(<SrsEffectsSheet effects={effects} onDismiss={onDismiss} />)

describe('SrsEffectsSheet', () => {
  it('shows the phrase and the score that was written for it', async () => {
    await show([effect()])

    expect(screen.getByText('break the ice')).toBeTruthy()
    expect(screen.getByText('Scored 8')).toBeTruthy()
  })

  it('shows before → after for score, times practiced and next due', async () => {
    await show([effect()])

    expect(screen.getByLabelText('Score: 6.0 to 7.0')).toBeTruthy()
    expect(screen.getByLabelText('Practiced: 2 to 3')).toBeTruthy()
    expect(screen.getByLabelText('Due: 2026-01-01 to 2026-01-08')).toBeTruthy()
  })

  it('marks a phrase that had never been practiced before', async () => {
    await show([effect({ before: {} })])

    expect(screen.getByLabelText('Score: never to 7.0')).toBeTruthy()
    expect(screen.getByLabelText('Practiced: never to 3')).toBeTruthy()
    expect(screen.getByLabelText('Due: never to 2026-01-08')).toBeTruthy()
  })

  it('lists one entry per effect', async () => {
    await show([effect(), effect({ expressionId: 'e2', expression: 'touch base', scoreWritten: 4 })])

    expect(screen.getAllByTestId('srs-effect')).toHaveLength(2)
  })

  it('says so when nothing has been scored yet', async () => {
    await show([])

    expect(screen.getByText('Nothing scored yet')).toBeTruthy()
  })

  it('dismisses on a press outside the card', async () => {
    const onDismiss = jest.fn()
    await show([effect()], onDismiss)

    await fireEvent.press(screen.getByLabelText('Dismiss effects'))

    expect(onDismiss).toHaveBeenCalled()
  })
})

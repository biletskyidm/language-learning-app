import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import type { TrainingSummary } from '@contracts'
import { TrainingRow } from '../training-row'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))

const summary = (overrides: Partial<TrainingSummary> = {}): TrainingSummary => ({
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  style: 'informal',
  targets: [],
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
})

describe('TrainingRow', () => {
  beforeEach(() => jest.mocked(router.push).mockReset())

  it('resumes an active chat on tap', async () => {
    await render(<TrainingRow training={summary()} />)

    await fireEvent.press(screen.getByRole('button'))

    expect(router.push).toHaveBeenCalledWith('/trainings/t1')
  })

  it.each(['COMPLETED', 'CANCELED'] as const)('does not offer to resume a %s chat', async (status) => {
    await render(<TrainingRow training={summary({ status })} />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('names a chat by its context and status', async () => {
    await render(<TrainingRow training={summary()} />)

    expect(screen.getByText('a scrum standup')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
  })

  it('shows the averages of a completed chat when they are there', async () => {
    await render(
      <TrainingRow
        training={summary({
          status: 'COMPLETED',
          finalAssessment: {
            averages: {
              contextCorrectness: 7,
              grammarAndSyntax: 8,
              vocabularyDiversity: 6.25,
              sentenceComplexity: 5,
              sentenceNaturalness: 7.5,
            },
          },
        })}
      />,
    )

    expect(
      screen.getByText('Context 7.0 · Grammar 8.0 · Vocabulary 6.3 · Complexity 5.0 · Naturalness 7.5'),
    ).toBeTruthy()
  })
})

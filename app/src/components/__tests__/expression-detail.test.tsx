import React from 'react'
import { render, screen } from '@testing-library/react-native'
import type { Expression } from '@contracts'
import { ExpressionDetail } from '../expression-detail'

const NOW = new Date('2026-03-01T00:00:00.000Z')

const expression = (overrides: Partial<Expression> = {}): Expression => ({
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

describe('ExpressionDetail', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW }))
  afterEach(() => jest.useRealTimers())

  it('counts a never-practiced expression as zero', async () => {
    await render(<ExpressionDetail expression={expression()} />)

    expect(screen.getByText('Trained 0 times')).toBeTruthy()
  })

  it('keeps the counter singular after one training', async () => {
    await render(<ExpressionDetail expression={expression({ timesPracticed: 1 })} />)

    expect(screen.getByText('Trained 1 time')).toBeTruthy()
  })

  it('shows the counter for a well practiced expression', async () => {
    await render(<ExpressionDetail expression={expression({ timesPracticed: 7 })} />)

    expect(screen.getByText('Trained 7 times')).toBeTruthy()
  })

  it('dashes the score and the dates of a never-practiced expression', async () => {
    await render(<ExpressionDetail expression={expression()} />)

    expect(screen.getAllByText('—')).toHaveLength(3)
  })

  it('shows the score with one decimal', async () => {
    await render(<ExpressionDetail expression={expression({ score: 7 })} />)

    expect(screen.getByText('7.0')).toBeTruthy()
  })

  it('describes the dates relative to now', async () => {
    await render(
      <ExpressionDetail
        expression={expression({
          score: 6.5,
          timesPracticed: 3,
          lastTimePracticedAt: new Date('2026-02-27T00:00:00.000Z'),
          nextTrainingAt: new Date('2026-03-08T00:00:00.000Z'),
        })}
      />,
    )

    expect(screen.getByText('2 days ago')).toBeTruthy()
    expect(screen.getByText('in 7 days')).toBeTruthy()
  })

  it('calls out an overdue expression', async () => {
    await render(<ExpressionDetail expression={expression({ nextTrainingAt: new Date('2026-02-01T00:00:00.000Z') })} />)

    expect(screen.getByText('due now')).toBeTruthy()
  })

  it('lists examples and tags', async () => {
    await render(<ExpressionDetail expression={expression({ examples: ['Someone had to break the ice.'], tags: ['work'] })} />)

    expect(screen.getByText('· Someone had to break the ice.')).toBeTruthy()
    expect(screen.getByText('work')).toBeTruthy()
  })
})

import React from 'react'
import { render, screen } from '@testing-library/react-native'
import type { Expression } from '@contracts'
import { colors } from '../../theme/tokens'
import { SrsSummary } from '../srs-summary'

const now = new Date('2026-02-01T12:00:00.000Z')

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

describe('SrsSummary', () => {
  it('names the frequency tier of an unpracticed expression in words', async () => {
    await render(<SrsSummary expression={expression({ frequency: 'very_common' })} now={now} />)

    expect(screen.getByText(/New · very common/)).toBeTruthy()
  })

  it('shows score, times trained and the due date of a practiced expression', async () => {
    await render(
      <SrsSummary
        expression={expression({
          score: 7.25,
          timesPracticed: 3,
          nextTrainingAt: new Date('2026-02-06T12:00:00.000Z'),
        })}
        now={now}
      />,
    )

    expect(screen.getByText('7.3')).toHaveStyle({ color: colors.ok })
    expect(screen.getByText(/Trained 3× · Due Feb 6/)).toBeTruthy()
  })

  it('counts a zero score as practiced', async () => {
    await render(<SrsSummary expression={expression({ score: 0 })} now={now} />)

    expect(screen.getByText('0.0')).toHaveStyle({ color: colors.error })
    expect(screen.getByText(/Trained 0×/)).toBeTruthy()
  })
})

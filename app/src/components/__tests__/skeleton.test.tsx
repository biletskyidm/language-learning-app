import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { Skeleton } from '../skeleton'

describe('Skeleton', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('renders a placeholder block', async () => {
    await render(<Skeleton width={120} height={16} />)

    expect(screen.getByTestId('skeleton')).toBeTruthy()
  })
})

import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { TypingIndicator } from '../typing-indicator'

describe('TypingIndicator', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('shows the three dots of the wave', async () => {
    await render(<TypingIndicator />)

    expect(screen.getAllByTestId('typing-dot')).toHaveLength(3)
    expect(screen.getByLabelText('Tutor is typing')).toBeTruthy()
  })
})

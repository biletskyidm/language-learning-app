import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { TargetMeaning } from '../target-meaning'

const target = { expressionId: 'e1', expression: 'break the ice', meaning: 'start a conversation' }

describe('TargetMeaning', () => {
  it('shows the phrase and its meaning', async () => {
    await render(<TargetMeaning target={target} onDismiss={() => {}} />)

    expect(screen.getByText('break the ice')).toBeTruthy()
    expect(screen.getByText('start a conversation')).toBeTruthy()
  })

  it('dismisses on backdrop press', async () => {
    const onDismiss = jest.fn()
    await render(<TargetMeaning target={target} onDismiss={onDismiss} />)

    await fireEvent.press(screen.getByLabelText('Dismiss meaning'))

    expect(onDismiss).toHaveBeenCalled()
  })
})

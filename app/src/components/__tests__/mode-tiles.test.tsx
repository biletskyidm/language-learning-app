import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ModeTiles } from '../mode-tiles'

const modes = [
  { mode: 'chat', emoji: '💬', name: 'Chat', blurb: 'Role-play a situation with the tutor.' },
  { mode: 'gaps', emoji: '🧩', name: 'Gaps', blurb: 'Put the phrases back.' },
]

describe('ModeTiles', () => {
  it('renders every mode name and blurb', async () => {
    await render(<ModeTiles modes={modes} selected="chat" onSelect={jest.fn()} />)

    expect(screen.getByText('Chat')).toBeTruthy()
    expect(screen.getByText('Role-play a situation with the tutor.')).toBeTruthy()
    expect(screen.getByText('Gaps')).toBeTruthy()
    expect(screen.getByText('Put the phrases back.')).toBeTruthy()
  })

  it('selects the pressed mode', async () => {
    const onSelect = jest.fn()
    await render(<ModeTiles modes={modes} selected="chat" onSelect={onSelect} />)

    await fireEvent.press(screen.getByText('Gaps'))

    expect(onSelect).toHaveBeenCalledWith('gaps')
  })

  it('marks only the selected tile', async () => {
    await render(<ModeTiles modes={modes} selected="gaps" onSelect={jest.fn()} />)

    expect(screen.getByRole('button', { name: /Gaps/ })).toBeSelected()
    expect(screen.getByRole('button', { name: /Chat/ })).not.toBeSelected()
  })
})

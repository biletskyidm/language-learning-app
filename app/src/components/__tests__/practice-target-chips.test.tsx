import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Expression } from '@contracts'
import { PracticeTargetChips } from '../practice-target-chips'

const expression = (id: string, text: string): Expression => ({
  id,
  userId: 'me',
  expression: text,
  type: 'idiom',
  meaning: '',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
})

const targets = [expression('e1', 'break the ice'), expression('e2', 'under the weather')]

const setup = (overrides: Partial<React.ComponentProps<typeof PracticeTargetChips>> = {}) => {
  const props = { targets, removable: true, onOpen: jest.fn(), onRemove: jest.fn(), onAdd: jest.fn(), ...overrides }
  return { props, view: render(<PracticeTargetChips {...props} />) }
}

describe('PracticeTargetChips', () => {
  it('renders a chip per target', async () => {
    await setup().view

    expect(screen.getByText('break the ice')).toBeTruthy()
    expect(screen.getByText('under the weather')).toBeTruthy()
  })

  it('opens the pressed target', async () => {
    const { props, view } = setup()
    await view

    await fireEvent.press(screen.getByText('under the weather'))

    expect(props.onOpen).toHaveBeenCalledWith(targets[1])
  })

  it('removes the target at its index', async () => {
    const { props, view } = setup()
    await view

    await fireEvent.press(screen.getByLabelText('Remove under the weather'))

    expect(props.onRemove).toHaveBeenCalledWith(1)
    expect(props.onOpen).not.toHaveBeenCalled()
  })

  it('hides remove when removal is not allowed', async () => {
    await setup({ removable: false }).view

    expect(screen.queryByLabelText('Remove break the ice')).toBeNull()
  })

  it('offers add when provided', async () => {
    const { props, view } = setup()
    await view

    await fireEvent.press(screen.getByLabelText('Add expression'))

    expect(props.onAdd).toHaveBeenCalled()
  })

  it('hides add when not provided', async () => {
    await setup({ onAdd: undefined }).view

    expect(screen.queryByLabelText('Add expression')).toBeNull()
  })
})

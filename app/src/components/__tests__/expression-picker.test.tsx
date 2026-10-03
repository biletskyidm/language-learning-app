import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Expression } from '@contracts'
import { useExpressions } from '../../api/use-expressions'
import { ExpressionPicker } from '../expression-picker'

jest.mock('../../api/use-expressions', () => ({ useExpressions: jest.fn() }))

const expression = (id: string, text: string, meaning: string): Expression => ({
  id,
  userId: 'me',
  expression: text,
  type: 'idiom',
  meaning,
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
})

const items = [expression('e1', 'break the ice', 'start a conversation'), expression('e2', 'cut corners', 'do it cheaply')]

const query = (state: { data?: { items: Expression[] }; isPending?: boolean; isError?: boolean }) =>
  jest.mocked(useExpressions).mockReturnValue({ isPending: false, isError: false, ...state } as never)

const setup = (excludedIds: string[] = []) => {
  const props = { excludedIds, onSelect: jest.fn(), onClose: jest.fn() }
  return { props, view: render(<ExpressionPicker {...props} />) }
}

describe('ExpressionPicker', () => {
  beforeEach(() => query({ data: { items } }))

  it('has no title, cancel link or tag filter', async () => {
    await setup().view

    expect(screen.queryByText('Add an expression')).toBeNull()
    expect(screen.queryByText('Cancel')).toBeNull()
    expect(screen.queryByText('Tag…')).toBeNull()
  })

  it('closes from the close button without selecting', async () => {
    const { props, view } = setup()
    await view

    await fireEvent.press(screen.getByLabelText('Close'))

    expect(props.onClose).toHaveBeenCalled()
    expect(props.onSelect).not.toHaveBeenCalled()
  })

  it('selects the pressed expression and closes', async () => {
    const { props, view } = setup()
    await view

    await fireEvent.press(screen.getByText('cut corners'))

    expect(props.onSelect).toHaveBeenCalledWith(items[1])
    expect(props.onClose).toHaveBeenCalled()
  })

  it('hides excluded expressions', async () => {
    await setup(['e1']).view

    expect(screen.queryByText('break the ice')).toBeNull()
    expect(screen.getByText('cut corners')).toBeTruthy()
  })

  it('searches by the typed text', async () => {
    await setup().view

    await fireEvent.changeText(screen.getByLabelText('Search your phrases'), 'ice')

    expect(useExpressions).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ice' }))
    expect(useExpressions).toHaveBeenLastCalledWith(expect.not.objectContaining({ tag: expect.anything() }))
  })

  it('lists due phrases first', async () => {
    await setup().view

    expect(useExpressions).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'nextTrainingAt', dir: 'asc' }))
  })

  it('shows nothing matches when the list is empty', async () => {
    query({ data: { items: [] } })
    await setup().view

    expect(screen.getByText('Nothing matches that')).toBeTruthy()
  })

  it('shows an error when loading fails', async () => {
    query({ isError: true })
    await setup().view

    expect(screen.getByText('Could not load your vocabulary')).toBeTruthy()
  })
})

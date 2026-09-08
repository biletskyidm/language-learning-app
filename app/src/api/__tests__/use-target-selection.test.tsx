import { act, renderHook } from '@testing-library/react-native'
import type { Expression } from '@contracts'
import { MAX_TARGETS, useTargetSelection } from '../use-target-selection'

const expression = (id: string): Expression => ({
  id,
  userId: 'me',
  expression: `phrase ${id}`,
  type: 'idiom',
  meaning: 'a meaning',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
})

const ids = (targets: Expression[]) => targets.map((target) => target.id)

const range = (count: number) => Array.from({ length: count }, (_, index) => expression(`e${index}`))

describe('useTargetSelection', () => {
  it('starts from what the picker suggested', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(3)))

    expect(ids(result.current.targets)).toEqual(['e0', 'e1', 'e2'])
  })

  it('swaps one suggestion for another and leaves the rest in place', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(3)))

    await act(() => result.current.replace(1, expression('other')))

    expect(ids(result.current.targets)).toEqual(['e0', 'other', 'e2'])
  })

  it('ignores a replacement that is already selected somewhere else', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(3)))

    await act(() => result.current.replace(0, expression('e2')))

    expect(ids(result.current.targets)).toEqual(['e0', 'e1', 'e2'])
  })

  it('drops a suggestion it was told to remove', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(3)))

    await act(() => result.current.remove(0))

    expect(ids(result.current.targets)).toEqual(['e1', 'e2'])
  })

  it('keeps the last target rather than leaving nothing to practice', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(1)))

    await act(() => result.current.remove(0))

    expect(ids(result.current.targets)).toEqual(['e0'])
  })

  it('adds an expression the picker did not suggest', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(1)))

    await act(() => result.current.add(expression('other')))

    expect(ids(result.current.targets)).toEqual(['e0', 'other'])
  })

  it('ignores an expression that is already selected', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(2)))

    await act(() => result.current.add(expression('e1')))

    expect(ids(result.current.targets)).toEqual(['e0', 'e1'])
  })

  it('stops adding at the upper bound', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(MAX_TARGETS)))

    await act(() => result.current.add(expression('one-too-many')))

    expect(result.current.targets).toHaveLength(MAX_TARGETS)
    expect(ids(result.current.targets)).not.toContain('one-too-many')
  })

  it('ignores an index that is not in the selection', async () => {
    const { result } = await renderHook(() => useTargetSelection(range(2)))

    await act(() => result.current.replace(5, expression('other')))
    await act(() => result.current.remove(-1))

    expect(ids(result.current.targets)).toEqual(['e0', 'e1'])
  })
})

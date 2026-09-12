import { act, renderHook } from '@testing-library/react-native'
import type { GapsRound } from '@contracts'
import { useGapsBoard } from '../gaps-board'

const targets = [
  { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
  { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
]

const round = (overrides: Partial<GapsRound> = {}): GapsRound => ({
  index: 0,
  targets,
  material: {
    parts: ['He tried to ', ' over coffee, then went off to ', ' with his manager.'],
    bank: ['touch base', 'break the ice'],
  },
  ...overrides,
})

describe('useGapsBoard', () => {
  it('sits idle until a round arrives', async () => {
    const { result } = await renderHook(() => useGapsBoard())

    expect(result.current.phase).toBe('idle')
    expect(result.current.ready).toBe(false)
  })

  it('opens an unanswered round with every blank empty', async () => {
    const { result } = await renderHook(() => useGapsBoard(round()))

    expect(result.current.phase).toBe('playing')
    expect(result.current.fills).toEqual([null, null])
    expect(result.current.ready).toBe(false)
  })

  it('drops a tapped phrase into the first empty blank', async () => {
    const { result } = await renderHook(() => useGapsBoard(round()))

    await act(() => result.current.place('touch base'))

    expect(result.current.fills).toEqual(['touch base', null])
  })

  it('fills the blanks left to right as phrases are tapped', async () => {
    const { result } = await renderHook(() => useGapsBoard(round()))

    await act(() => result.current.place('break the ice'))
    await act(() => result.current.place('touch base'))

    expect(result.current.fills).toEqual(['break the ice', 'touch base'])
    expect(result.current.ready).toBe(true)
  })

  it('ignores a phrase tapped when every blank is taken', async () => {
    const { result } = await renderHook(() => useGapsBoard(round()))

    await act(() => result.current.place('break the ice'))
    await act(() => result.current.place('touch base'))
    await act(() => result.current.place('break the ice'))

    expect(result.current.fills).toEqual(['break the ice', 'touch base'])
  })

  it('empties a blank that is tapped again, freeing its phrase', async () => {
    const { result } = await renderHook(() => useGapsBoard(round()))

    await act(() => result.current.place('break the ice'))
    expect(result.current.placed('break the ice')).toBe(true)

    await act(() => result.current.clear(0))

    expect(result.current.fills).toEqual([null, null])
    expect(result.current.placed('break the ice')).toBe(false)
  })

  it('shows what was submitted once the round is checked', async () => {
    const checked = round({
      answer: { fills: ['break the ice', 'ballpark figure'] },
      verdict: {
        perBlank: [
          { expected: 'break the ice', given: 'break the ice', correct: true },
          { expected: 'touch base', given: 'ballpark figure', correct: false },
        ],
      },
      answeredAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const { result } = await renderHook(() => useGapsBoard(checked))

    expect(result.current.phase).toBe('checked')
    expect(result.current.fills).toEqual(['break the ice', 'ballpark figure'])
  })

  it('refuses to move a phrase on a round that is already checked', async () => {
    const checked = round({
      answer: { fills: ['break the ice', 'touch base'] },
      verdict: {
        perBlank: [
          { expected: 'break the ice', given: 'break the ice', correct: true },
          { expected: 'touch base', given: 'touch base', correct: true },
        ],
      },
    })
    const { result } = await renderHook(() => useGapsBoard(checked))

    await act(() => result.current.clear(0))

    expect(result.current.fills).toEqual(['break the ice', 'touch base'])
  })

  it('starts the next round on an empty board', async () => {
    const { result, rerender } = await renderHook((current?: GapsRound) => useGapsBoard(current), {
      initialProps: round(),
    })

    await act(() => result.current.place('break the ice'))
    await act(() => rerender(round({ index: 1 })))

    expect(result.current.phase).toBe('playing')
    expect(result.current.fills).toEqual([null, null])
  })
})

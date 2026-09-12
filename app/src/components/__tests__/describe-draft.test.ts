import { act, renderHook } from '@testing-library/react-native'
import type { DescribeRound } from '@contracts'
import { useDescribeDraft } from '../describe-draft'

const round = (overrides: Partial<DescribeRound> = {}): DescribeRound => ({
  index: 0,
  targets: [{ expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' }],
  material: {
    targetExpressionId: 'e1',
    expression: 'break the ice',
    candidates: ['break the ice', 'touch base'],
  },
  ...overrides,
})

describe('useDescribeDraft', () => {
  it('sits idle until a round arrives', async () => {
    const { result } = await renderHook(() => useDescribeDraft())

    expect(result.current.phase).toBe('idle')
    expect(result.current.ready).toBe(false)
  })

  it('opens an unanswered round with an empty box', async () => {
    const { result } = await renderHook(() => useDescribeDraft(round()))

    expect(result.current.phase).toBe('writing')
    expect(result.current.description).toBe('')
    expect(result.current.ready).toBe(false)
  })

  it('keeps what is typed', async () => {
    const { result } = await renderHook(() => useDescribeDraft(round()))

    await act(() => result.current.write('saying something light to warm up a cold room'))

    expect(result.current.description).toBe('saying something light to warm up a cold room')
    expect(result.current.ready).toBe(true)
  })

  it('holds back a description too short to send', async () => {
    const { result } = await renderHook(() => useDescribeDraft(round()))

    await act(() => result.current.write('  dunno  '))

    expect(result.current.ready).toBe(false)
  })

  it('holds back a description past the length the API takes', async () => {
    const { result } = await renderHook(() => useDescribeDraft(round()))

    await act(() => result.current.write('a'.repeat(601)))

    expect(result.current.ready).toBe(false)
  })

  it('shows what was submitted once the round is judged', async () => {
    const judged = round({
      answer: { description: 'saying something light to warm up a cold room' },
      verdict: { guess: 'break the ice', correct: true, note: 'Clear and to the point.' },
      answeredAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const { result } = await renderHook(() => useDescribeDraft(judged))

    expect(result.current.phase).toBe('judged')
    expect(result.current.description).toBe('saying something light to warm up a cold room')
  })

  it('refuses to rewrite a round that is already judged', async () => {
    const judged = round({
      answer: { description: 'saying something light to warm up a cold room' },
      verdict: { guess: 'touch base', correct: false, note: 'A bit vague.' },
    })
    const { result } = await renderHook(() => useDescribeDraft(judged))

    await act(() => result.current.write('something else'))

    expect(result.current.description).toBe('saying something light to warm up a cold room')
  })

  it('starts the next round on an empty box', async () => {
    const { result, rerender } = await renderHook((current?: DescribeRound) => useDescribeDraft(current), {
      initialProps: round(),
    })

    await act(() => result.current.write('saying something light to warm up a cold room'))
    await act(() => rerender(round({ index: 1 })))

    expect(result.current.phase).toBe('writing')
    expect(result.current.description).toBe('')
  })
})

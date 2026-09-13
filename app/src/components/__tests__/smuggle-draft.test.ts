import { act, renderHook } from '@testing-library/react-native'
import type { SmuggleRound } from '@contracts'
import { useSmuggleDraft } from '../smuggle-draft'

const targets = [
  { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
  { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
  { expressionId: 'e3', expression: 'a ballpark figure', meaning: 'a rough estimate' },
]

const MESSAGE = 'I broke the ice with a joke and said we would touch base once I had a ballpark figure.'

const round = (overrides: Partial<SmuggleRound> = {}): SmuggleRound => ({
  index: 0,
  targets,
  material: { targets },
  ...overrides,
})

const judged = round({
  answer: { message: MESSAGE },
  verdict: {
    results: [
      { expression: 'break the ice', score: 9, note: 'Natural.' },
      { expression: 'touch base', score: 0, note: 'Missing.' },
      { expression: 'a ballpark figure', score: 7, note: 'Good fit.' },
    ],
    reply: 'Sounds good — Friday works.',
  },
  answeredAt: new Date('2026-01-01T00:00:00.000Z'),
})

describe('useSmuggleDraft', () => {
  it('sits idle until a round arrives', async () => {
    const { result } = await renderHook(() => useSmuggleDraft())

    expect(result.current.phase).toBe('idle')
    expect(result.current.ready).toBe(false)
  })

  it('opens an unanswered round with an empty box and no chip lit', async () => {
    const { result } = await renderHook(() => useSmuggleDraft(round()))

    expect(result.current.phase).toBe('writing')
    expect(result.current.message).toBe('')
    expect(result.current.scores.size).toBe(0)
  })

  it('holds back a message too short to have smuggled anything', async () => {
    const { result } = await renderHook(() => useSmuggleDraft(round()))

    await act(() => result.current.write('too short'))

    expect(result.current.ready).toBe(false)
  })

  it('is ready once the message is long enough', async () => {
    const { result } = await renderHook(() => useSmuggleDraft(round()))

    await act(() => result.current.write(MESSAGE))

    expect(result.current.ready).toBe(true)
  })

  it('holds back a message past the length the API takes', async () => {
    const { result } = await renderHook(() => useSmuggleDraft(round()))

    await act(() => result.current.write('a'.repeat(1501)))

    expect(result.current.ready).toBe(false)
  })

  it("keeps each judged phrase's score, including a zero", async () => {
    const { result } = await renderHook(() => useSmuggleDraft(judged))

    expect(result.current.phase).toBe('judged')
    expect([...result.current.scores]).toEqual([
      ['break the ice', 9],
      ['touch base', 0],
      ['a ballpark figure', 7],
    ])
  })

  it('shows what was sent once the round is judged', async () => {
    const { result } = await renderHook(() => useSmuggleDraft(judged))

    expect(result.current.message).toBe(MESSAGE)
  })

  it('refuses to rewrite a round that is already judged', async () => {
    const { result } = await renderHook(() => useSmuggleDraft(judged))

    await act(() => result.current.write('something else'))

    expect(result.current.message).toBe(MESSAGE)
  })

  it('starts the next round on an empty box', async () => {
    const { result, rerender } = await renderHook((current?: SmuggleRound) => useSmuggleDraft(current), {
      initialProps: round(),
    })

    await act(() => result.current.write(MESSAGE))
    await act(() => rerender(round({ index: 1 })))

    expect(result.current.message).toBe('')
    expect(result.current.phase).toBe('writing')
  })
})

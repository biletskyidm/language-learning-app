import { describe, expect, it } from 'vitest'
import { norm } from '../src/drills/norm'

describe('norm', () => {
  it('ignores capitalisation', () => {
    expect(norm('Break The Ice')).toBe(norm('break the ice'))
  })

  it('keeps apostrophes, so a contraction is not the same as its expansion', () => {
    expect(norm("don't sweat it")).toBe("don't sweat it")
    expect(norm("don't sweat it")).not.toBe(norm('dont sweat it'))
  })

  it('drops surrounding punctuation the user typed around the phrase', () => {
    expect(norm('  "break the ice!" ')).toBe('break the ice')
  })

  it('collapses runs of whitespace', () => {
    expect(norm('touch\n  base')).toBe('touch base')
  })

  it('treats punctuation inside the phrase as a word break', () => {
    expect(norm('cut-and-dried')).toBe('cut and dried')
  })

  it('leaves nothing behind for an answer of only punctuation', () => {
    expect(norm('???')).toBe('')
  })
})

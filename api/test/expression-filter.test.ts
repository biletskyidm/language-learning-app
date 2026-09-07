import { describe, expect, it } from 'vitest'
import { listFilter } from '../src/expressions/mongo-repository'

describe('listFilter', () => {
  it('scopes every query to the caller', () => {
    expect(listFilter('me', {})).toEqual({ userId: 'me' })
  })

  it('matches the expression or the meaning case-insensitively', () => {
    expect(listFilter('me', { search: 'ice' })).toEqual({
      userId: 'me',
      $or: [
        { expression: { $regex: 'ice', $options: 'i' } },
        { meaning: { $regex: 'ice', $options: 'i' } },
      ],
    })
  })

  it('escapes regex metacharacters so a search stays a literal substring', () => {
    const filter = listFilter('me', { search: 'a.b*c(' })
    const pattern = filter.$or?.[0]?.expression.$regex ?? ''

    expect(() => new RegExp(pattern)).not.toThrow()
    expect(new RegExp(pattern).test('xa.b*c(y')).toBe(true)
    expect(new RegExp(pattern).test('axbxcx')).toBe(false)
  })

  it('ignores a blank search', () => {
    expect(listFilter('me', { search: '   ' })).toEqual({ userId: 'me' })
  })
})

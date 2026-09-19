import { relativeDays, shortDate } from '../expression-srs'

const now = new Date('2026-02-01T12:00:00.000Z')

describe('shortDate', () => {
  it('leaves the current year out and keeps another one', () => {
    expect(shortDate(new Date('2026-08-24T00:00:00.000Z'), now)).toBe('Aug 24')
    expect(shortDate(new Date('2027-08-24T00:00:00.000Z'), now)).toBe('Aug 24, 2027')
  })
})

describe('relativeDays', () => {
  it('words the days around today', () => {
    expect(relativeDays(new Date('2026-02-01T18:00:00.000Z'), now)).toBe('today')
    expect(relativeDays(new Date('2026-02-02T12:00:00.000Z'), now)).toBe('tomorrow')
    expect(relativeDays(new Date('2026-01-31T12:00:00.000Z'), now)).toBe('yesterday')
    expect(relativeDays(new Date('2026-01-25T12:00:00.000Z'), now)).toBe('7 days ago')
  })
})

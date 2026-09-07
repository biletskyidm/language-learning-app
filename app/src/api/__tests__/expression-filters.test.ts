import {
  DEFAULT_FILTERS,
  filtersFromParams,
  filtersToParams,
  filtersToQuery,
  isFiltered,
} from '../expression-filters'

describe('filtersFromParams', () => {
  it('falls back to the defaults when the route carries nothing', () => {
    expect(filtersFromParams({})).toEqual(DEFAULT_FILTERS)
  })

  it('reads every filter off the route', () => {
    expect(filtersFromParams({ search: 'ice', tag: 'work', frequency: 'uncommon', due: 'true', sort: 'score', dir: 'asc' })).toEqual({
      search: 'ice',
      tag: 'work',
      frequency: 'uncommon',
      due: true,
      sort: 'score',
      dir: 'asc',
    })
  })

  it('drops values the API would reject', () => {
    expect(filtersFromParams({ frequency: 'sometimes', sort: 'vibes', dir: 'sideways' })).toEqual(DEFAULT_FILTERS)
  })

  it('keeps the first value when the route repeats a param', () => {
    expect(filtersFromParams({ tag: ['work', 'travel'] }).tag).toBe('work')
  })

  it('survives a round trip through the route params', () => {
    const filters = { search: 'run late', tag: 'work', frequency: 'common' as const, due: true, sort: 'nextTrainingAt' as const, dir: 'asc' as const }

    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters)
  })

  it('clears a filter that was dropped rather than leaving it on the route', () => {
    expect(filtersToParams({ ...DEFAULT_FILTERS, search: 'ice' })).toEqual({
      search: 'ice',
      tag: '',
      frequency: '',
      due: '',
      sort: 'createdAt',
      dir: 'desc',
    })
  })
})

describe('filtersToQuery', () => {
  it('sends nothing when no filter is set', () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe('')
  })

  it('url-encodes the search term', () => {
    expect(filtersToQuery({ ...DEFAULT_FILTERS, search: 'break the ice' })).toBe('?search=break%20the%20ice')
  })

  it('sends every active filter', () => {
    expect(
      filtersToQuery({ search: ' run ', tag: 'work', frequency: 'formal/academic', due: true, sort: 'score', dir: 'asc' }),
    ).toBe('?search=run&tag=work&frequency=formal%2Facademic&due=true&sort=score&dir=asc')
  })

  it('leaves the default sort out of the query', () => {
    expect(filtersToQuery({ ...DEFAULT_FILTERS, dir: 'asc' })).toBe('?dir=asc')
  })

  it('omits the due flag when it is off', () => {
    expect(filtersToQuery({ ...DEFAULT_FILTERS, due: false, tag: 'work' })).toBe('?tag=work')
  })
})

describe('isFiltered', () => {
  it('ignores the search box and the sort control', () => {
    expect(isFiltered({ ...DEFAULT_FILTERS, search: 'ice', sort: 'score' })).toBe(false)
    expect(isFiltered({ ...DEFAULT_FILTERS, due: true })).toBe(true)
    expect(isFiltered({ ...DEFAULT_FILTERS, tag: 'work' })).toBe(true)
  })
})

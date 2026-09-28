import { sessionStack, trainingRoute } from '../training-route'

describe('trainingRoute', () => {
  it('opens an active session on the screen that plays it', () => {
    expect(trainingRoute('smuggle', 't1')).toBe('/trainings/smuggle/t1')
    expect(trainingRoute('chat', 't1')).toBe('/trainings/t1')
  })

  it('opens an ended session read-only', () => {
    expect(trainingRoute('describe', 't1', 'COMPLETED')).toBe('/trainings/history/t1')
  })
})

describe('sessionStack', () => {
  it('keeps the Home and Sessions already on the stack and drops everything else', () => {
    const current = [
      { key: 'home', name: 'index' },
      { key: 'list', name: 'trainings/index', params: { status: 'ACTIVE' } },
      { key: 'pick', name: 'practice' },
    ]

    expect(sessionStack(current, 'chat', 't1')).toEqual([
      { key: 'home', name: 'index', params: undefined },
      { key: 'list', name: 'trainings/index', params: { status: 'ACTIVE' } },
      { name: 'trainings/[id]', params: { id: 't1' } },
    ])
  })

  it('adds Sessions when starting straight from Home', () => {
    expect(sessionStack([{ key: 'home', name: 'index' }], 'describe', 't1').map(({ name }) => name)).toEqual([
      'index',
      'trainings/index',
      'trainings/describe/[id]',
    ])
  })
})

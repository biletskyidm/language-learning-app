import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  chatTrainingSchema,
  DEFAULT_SCENARIOS,
  scenarioListResponseSchema,
  scenarioSchema,
  type Expression,
  type Scenario,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemoryScenarioRepository } from '../src/scenarios/memory-repository'
import { bearer, NOW, TEST_SECRET, testDeps } from './deps'
import { FakeLlmGateway } from './fake-llm'

const expression = (id: string): Expression => ({
  id,
  userId: 'me',
  expression: `phrase ${id}`,
  type: 'phrase',
  meaning: 'a meaning',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2025-12-01T00:00:00.000Z'),
})

const scenario = (id: string, userId: string): Scenario => ({
  id,
  userId,
  name: `scenario ${id}`,
  context: 'a context',
  style: 'formal',
  createdAt: NOW,
})

const harness = (stored: Scenario[] = []) => {
  const scenarios = new InMemoryScenarioRepository(stored)
  const deps = testDeps({
    expressions: new InMemoryExpressionRepository(Array.from({ length: 6 }, (_, i) => expression(`e${i}`))),
    scenarios,
    llm: new FakeLlmGateway({ firstMessages: ['Morning.'] }),
  })

  return { app: createApp(deps), scenarios }
}

const send = (app: ReturnType<typeof createApp>, method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { Authorization: bearer(TEST_SECRET), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const list = async (app: ReturnType<typeof createApp>) =>
  scenarioListResponseSchema.parse(await (await send(app, 'GET', '/scenarios')).json()).items

describe('GET /scenarios', () => {
  it('seeds the defaults for a user who has none', async () => {
    const { app } = harness()

    const res = await send(app, 'GET', '/scenarios')

    expect(res.status).toBe(200)
    const items = scenarioListResponseSchema.parse(await res.json()).items
    expect(items.map(({ name, context, style }) => ({ name, context, style }))).toEqual(DEFAULT_SCENARIOS)
  })

  it('seeds the defaults only once', async () => {
    const { app } = harness()

    const first = await list(app)
    const second = await list(app)

    expect(second).toHaveLength(DEFAULT_SCENARIOS.length)
    expect(second.map(({ id }) => id)).toEqual(first.map(({ id }) => id))
  })

  it('leaves a user who already has scenarios alone', async () => {
    const { app } = harness([scenario('s1', 'me')])

    const items = await list(app)

    expect(items.map(({ id }) => id)).toEqual(['s1'])
  })

  it('never answers with somebody else’s scenarios', async () => {
    const { app } = harness([scenario('s1', 'me'), scenario('s2', 'someone-else')])

    const items = await list(app)

    expect(items.map(({ id }) => id)).toEqual(['s1'])
  })
})

describe('POST /scenarios', () => {
  it('saves a scenario and stamps it with the user', async () => {
    const { app } = harness([scenario('s1', 'me')])

    const res = await send(app, 'POST', '/scenarios', { name: 'Doctor', context: 'at the doctor', style: 'formal' })

    expect(res.status).toBe(201)
    const created = scenarioSchema.parse(await res.json())
    expect(created).toMatchObject({ name: 'Doctor', context: 'at the doctor', style: 'formal', userId: 'me' })
    expect((await list(app)).map(({ id }) => id)).toContain(created.id)
  })

  it.each([
    ['an empty name', { name: '  ', context: 'at the doctor', style: 'formal' }],
    ['a name over 60 characters', { name: 'n'.repeat(61), context: 'at the doctor', style: 'formal' }],
    ['a context over 500 characters', { name: 'Doctor', context: 'c'.repeat(501), style: 'formal' }],
    ['a style it does not know', { name: 'Doctor', context: 'at the doctor', style: 'chatty' }],
    ['no context at all', { name: 'Doctor', style: 'formal' }],
  ])('refuses %s', async (_case, body) => {
    const { app } = harness([scenario('s1', 'me')])

    const res = await send(app, 'POST', '/scenarios', body)

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /scenarios/:id', () => {
  it('changes only the fields it was given', async () => {
    const { app } = harness([scenario('s1', 'me')])

    const res = await send(app, 'PATCH', '/scenarios/s1', { name: 'Renamed' })

    expect(res.status).toBe(200)
    expect(scenarioSchema.parse(await res.json())).toMatchObject({
      id: 's1',
      name: 'Renamed',
      context: 'a context',
      style: 'formal',
    })
  })

  it('answers 404 for a scenario that is not mine', async () => {
    const { app } = harness([scenario('s2', 'someone-else')])

    const res = await send(app, 'PATCH', '/scenarios/s2', { name: 'Renamed' })

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND')
  })

  it('refuses a field it does not know', async () => {
    const { app } = harness([scenario('s1', 'me')])

    const res = await send(app, 'PATCH', '/scenarios/s1', { userId: 'someone-else' })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })
})

describe('DELETE /scenarios/:id', () => {
  it('drops the scenario', async () => {
    const { app } = harness([scenario('s1', 'me'), scenario('s3', 'me')])

    const res = await send(app, 'DELETE', '/scenarios/s1')

    expect(res.status).toBe(204)
    expect((await list(app)).map(({ id }) => id)).toEqual(['s3'])
  })

  it('answers 404 for a scenario that is not mine and leaves it in place', async () => {
    const { app, scenarios } = harness([scenario('s2', 'someone-else')])

    const res = await send(app, 'DELETE', '/scenarios/s2')

    expect(res.status).toBe(404)
    expect(await scenarios.findById('someone-else', 's2')).toBeDefined()
  })
})

describe('POST /trainings with a scenarioId', () => {
  it('copies the scenario context and style onto the chat', async () => {
    const { app } = harness([{ ...scenario('s1', 'me'), context: 'a standup', style: 'informal' }])

    const res = await send(app, 'POST', '/trainings', { type: 'chat', scenarioId: 's1' })

    expect(res.status).toBe(201)
    expect(chatTrainingSchema.parse(await res.json())).toMatchObject({ context: 'a standup', style: 'informal' })
  })

  it('answers 404 for a scenario it does not know', async () => {
    const { app } = harness([scenario('s1', 'me')])

    const res = await send(app, 'POST', '/trainings', { type: 'chat', scenarioId: 'nope' })

    expect(res.status).toBe(404)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('SCENARIO_NOT_FOUND')
  })

  it('answers 404 for a scenario that is not mine', async () => {
    const { app } = harness([scenario('s2', 'someone-else')])

    const res = await send(app, 'POST', '/trainings', { type: 'chat', scenarioId: 's2' })

    expect(res.status).toBe(404)
  })

  it('refuses a chat with neither a scenario nor a context', async () => {
    const { app } = harness([scenario('s1', 'me')])

    const res = await send(app, 'POST', '/trainings', { type: 'chat' })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('still takes a free-text context and style', async () => {
    const { app } = harness([scenario('s1', 'me')])

    const res = await send(app, 'POST', '/trainings', { type: 'chat', context: 'a dinner', style: 'informal' })

    expect(res.status).toBe(201)
    expect(chatTrainingSchema.parse(await res.json())).toMatchObject({ context: 'a dinner', style: 'informal' })
  })
})

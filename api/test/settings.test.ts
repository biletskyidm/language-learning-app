import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  chatTrainingSchema,
  DEFAULT_SETTINGS,
  gapsTrainingSchema,
  settingsSchema,
  type Expression,
  type Settings,
} from '@contracts'
import { createApp } from '../src/app'
import { InMemoryExpressionRepository } from '../src/expressions/memory-repository'
import { InMemorySettingsRepository } from '../src/settings/memory-repository'
import { bearer, TEST_SECRET, testDeps } from './deps'
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

const harness = (stored?: Settings) => {
  const deps = testDeps({
    expressions: new InMemoryExpressionRepository(Array.from({ length: 12 }, (_, i) => expression(`e${i}`))),
    settings: new InMemorySettingsRepository(stored ? new Map([['me', stored]]) : undefined),
    llm: new FakeLlmGateway({ firstMessages: ['Morning.'] }),
  })

  return { app: createApp(deps), deps }
}

const send = (app: ReturnType<typeof createApp>, method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { Authorization: bearer(TEST_SECRET), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

describe('GET /settings', () => {
  it('answers with the defaults when nothing has been saved', async () => {
    const { app } = harness()

    const res = await send(app, 'GET', '/settings')

    expect(res.status).toBe(200)
    expect(settingsSchema.parse(await res.json())).toEqual({
      chatTargets: 5,
      gapsTargets: 4,
      describeTargets: 1,
      smuggleTargets: 3,
      defaultStyle: 'informal',
    })
  })

  it('answers with what was last saved', async () => {
    const { app } = harness()
    await send(app, 'PUT', '/settings', { ...DEFAULT_SETTINGS, chatTargets: 9, defaultStyle: 'formal' })

    const res = await send(app, 'GET', '/settings')

    expect(settingsSchema.parse(await res.json())).toMatchObject({ chatTargets: 9, defaultStyle: 'formal' })
  })
})

describe('PUT /settings', () => {
  it('answers with the saved settings', async () => {
    const { app } = harness()

    const res = await send(app, 'PUT', '/settings', { ...DEFAULT_SETTINGS, gapsTargets: 7 })

    expect(res.status).toBe(200)
    expect(settingsSchema.parse(await res.json())).toMatchObject({ gapsTargets: 7 })
  })

  it.each([
    ['chatTargets', 21],
    ['chatTargets', 0],
    ['gapsTargets', 11],
    ['describeTargets', 0],
    ['smuggleTargets', 11],
    ['gapsTargets', 2.5],
  ])('rejects %s of %s', async (field, value) => {
    const { app } = harness()

    const res = await send(app, 'PUT', '/settings', { ...DEFAULT_SETTINGS, [field]: value })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a body that leaves a field out, rather than resetting it', async () => {
    const { app } = harness({ ...DEFAULT_SETTINGS, chatTargets: 8, gapsTargets: 9 })

    const res = await send(app, 'PUT', '/settings', { chatTargets: 8 })

    expect(res.status).toBe(400)
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('VALIDATION_ERROR')
    const after = await send(app, 'GET', '/settings')
    expect(settingsSchema.parse(await after.json())).toMatchObject({ chatTargets: 8, gapsTargets: 9 })
  })

  it('rejects a style it does not know', async () => {
    const { app } = harness()

    const res = await send(app, 'PUT', '/settings', { ...DEFAULT_SETTINGS, defaultStyle: 'chatty' })

    expect(res.status).toBe(400)
  })

  it('leaves earlier settings alone when the new ones are rejected', async () => {
    const { app } = harness()
    await send(app, 'PUT', '/settings', { ...DEFAULT_SETTINGS, chatTargets: 8 })

    await send(app, 'PUT', '/settings', { ...DEFAULT_SETTINGS, chatTargets: 99 })

    const res = await send(app, 'GET', '/settings')
    expect(settingsSchema.parse(await res.json())).toMatchObject({ chatTargets: 8 })
  })
})

describe('settings as the default target count', () => {
  it('gives a chat as many targets as the saved chatTargets', async () => {
    const { app } = harness({ ...DEFAULT_SETTINGS, chatTargets: 2 })

    const res = await send(app, 'POST', '/trainings', { type: 'chat', context: 'a standup', style: 'informal' })

    expect(res.status).toBe(201)
    expect(chatTrainingSchema.parse(await res.json()).targets).toHaveLength(2)
  })

  it('gives a gaps session as many targets as the saved gapsTargets', async () => {
    const { app } = harness({ ...DEFAULT_SETTINGS, gapsTargets: 6 })

    const res = await send(app, 'POST', '/trainings', { type: 'gaps' })

    expect(gapsTrainingSchema.parse(await res.json()).targets).toHaveLength(6)
  })

  it('falls back to the defaults when nothing has been saved', async () => {
    const { app } = harness()

    const res = await send(app, 'POST', '/trainings', { type: 'gaps' })

    expect(gapsTrainingSchema.parse(await res.json()).targets).toHaveLength(DEFAULT_SETTINGS.gapsTargets)
  })

  it('still takes an explicit limit over the saved setting', async () => {
    const { app } = harness({ ...DEFAULT_SETTINGS, chatTargets: 2 })

    const res = await send(app, 'POST', '/trainings', {
      type: 'chat',
      context: 'a standup',
      style: 'informal',
      limit: 7,
    })

    expect(chatTrainingSchema.parse(await res.json()).targets).toHaveLength(7)
  })
})

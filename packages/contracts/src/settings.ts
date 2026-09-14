import { z } from 'zod'
import { chatStyleSchema, type TrainingType } from './trainings'

export const TARGETS_BOUNDS = {
  chatTargets: { min: 1, max: 20, fallback: 5 },
  gapsTargets: { min: 1, max: 10, fallback: 4 },
  describeTargets: { min: 1, max: 10, fallback: 1 },
  smuggleTargets: { min: 1, max: 10, fallback: 3 },
} as const

type Bounds = { min: number; max: number; fallback: number }

const bounded = ({ min, max }: Bounds) => z.number().int().min(min).max(max)

const shape = {
  chatTargets: bounded(TARGETS_BOUNDS.chatTargets),
  gapsTargets: bounded(TARGETS_BOUNDS.gapsTargets),
  describeTargets: bounded(TARGETS_BOUNDS.describeTargets),
  smuggleTargets: bounded(TARGETS_BOUNDS.smuggleTargets),
  defaultStyle: chatStyleSchema,
}

/** A PUT carries the whole document: a missing field is a bad request, never a reset to the default. */
export const settingsInputSchema = z.object(shape)

/** A stored document may predate a field, so a read fills the gaps instead of failing. */
export const settingsSchema = z.object({
  chatTargets: shape.chatTargets.default(TARGETS_BOUNDS.chatTargets.fallback),
  gapsTargets: shape.gapsTargets.default(TARGETS_BOUNDS.gapsTargets.fallback),
  describeTargets: shape.describeTargets.default(TARGETS_BOUNDS.describeTargets.fallback),
  smuggleTargets: shape.smuggleTargets.default(TARGETS_BOUNDS.smuggleTargets.fallback),
  defaultStyle: shape.defaultStyle.default('informal'),
})

export type Settings = z.infer<typeof settingsSchema>
export type TargetsSetting = keyof typeof TARGETS_BOUNDS

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({})

export const TARGETS_SETTING = {
  chat: 'chatTargets',
  gaps: 'gapsTargets',
  describe: 'describeTargets',
  smuggle: 'smuggleTargets',
} as const satisfies Record<TrainingType, TargetsSetting>

import { z } from 'zod'
import { chatStyleSchema, type TrainingType } from './trainings'

export const TARGETS_BOUNDS = {
  chatTargets: { min: 1, max: 20, fallback: 5 },
  gapsTargets: { min: 1, max: 10, fallback: 4 },
  describeTargets: { min: 1, max: 10, fallback: 1 },
  smuggleTargets: { min: 1, max: 10, fallback: 3 },
} as const

const targets = ({ min, max, fallback }: { min: number; max: number; fallback: number }) =>
  z.number().int().min(min).max(max).default(fallback)

export const settingsSchema = z.object({
  chatTargets: targets(TARGETS_BOUNDS.chatTargets),
  gapsTargets: targets(TARGETS_BOUNDS.gapsTargets),
  describeTargets: targets(TARGETS_BOUNDS.describeTargets),
  smuggleTargets: targets(TARGETS_BOUNDS.smuggleTargets),
  defaultStyle: chatStyleSchema.default('informal'),
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

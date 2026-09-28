import { ObjectId } from 'mongodb'
import {
  describeVerdictSchema,
  smuggleVerdictSchema,
  trainingSchema,
  trainingSummarySchema,
  type Training,
  type TrainingSummary,
} from '@contracts'

export type TrainingDoc = { _id: ObjectId } & Record<string, unknown>

export const toDomain = (doc: TrainingDoc): Training => {
  const { _id, ...rest } = doc

  return trainingSchema.parse({ ...rest, id: _id.toHexString() })
}

const verdictScores = (verdict: unknown) => {
  const smuggle = smuggleVerdictSchema.safeParse(verdict)
  if (smuggle.success) return smuggle.data.results.map(({ score }) => score)
  const describe = describeVerdictSchema.safeParse(verdict)

  return describe.success ? [describe.data.score] : []
}

const drillScores = (rounds: unknown) =>
  Array.isArray(rounds) ? rounds.flatMap((round) => verdictScores(round?.verdict)) : []

export const summarize = ({ rounds, ...rest }: Record<string, unknown>): TrainingSummary =>
  trainingSummarySchema.parse({ ...rest, scores: rest.status === 'ACTIVE' ? undefined : drillScores(rounds) })

export const toSummary = (doc: TrainingDoc): TrainingSummary => {
  const { _id, ...rest } = doc

  return summarize({ ...rest, id: _id.toHexString() })
}

export const toDoc = (training: Training): TrainingDoc => {
  const { id, ...rest } = training

  return { _id: new ObjectId(id), ...rest }
}

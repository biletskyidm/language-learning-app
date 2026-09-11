import { ObjectId } from 'mongodb'
import { trainingSchema, trainingSummarySchema, type Training, type TrainingSummary } from '@contracts'

export type TrainingDoc = { _id: ObjectId } & Record<string, unknown>

export const toDomain = (doc: TrainingDoc): Training => {
  const { _id, ...rest } = doc

  return trainingSchema.parse({ ...rest, id: _id.toHexString() })
}

export const toSummary = (doc: TrainingDoc): TrainingSummary => {
  const { _id, ...rest } = doc

  return trainingSummarySchema.parse({ ...rest, id: _id.toHexString() })
}

export const toDoc = (training: Training): TrainingDoc => {
  const { id, ...rest } = training

  return { _id: new ObjectId(id), ...rest }
}

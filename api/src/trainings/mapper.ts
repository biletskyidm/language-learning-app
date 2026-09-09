import { ObjectId } from 'mongodb'
import { trainingSchema, type Training } from '@contracts'

export type TrainingDoc = { _id: ObjectId } & Record<string, unknown>

export const toDomain = (doc: TrainingDoc): Training => {
  const { _id, ...rest } = doc

  return trainingSchema.parse({ ...rest, id: _id.toHexString() })
}

export const toDoc = (training: Training): TrainingDoc => {
  const { id, ...rest } = training

  return { _id: new ObjectId(id), ...rest }
}

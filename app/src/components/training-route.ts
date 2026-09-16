import type { TrainingStatus, TrainingType } from '@contracts'

/** A type with no screen yet has no route, which is what makes its row unopenable. */
const SCREENS: Partial<Record<TrainingType, string>> = { chat: '/trainings', gaps: '/trainings/gaps', describe: '/trainings/describe', smuggle: '/trainings/smuggle' }

/** An ended session of any type opens read-only; only an active one goes back to the screen that plays it. */
export const trainingRoute = (type: TrainingType, id: string, status: TrainingStatus = 'ACTIVE') => {
  if (status !== 'ACTIVE') return `/trainings/history/${id}`
  const screen = SCREENS[type]

  return screen ? `${screen}/${id}` : undefined
}

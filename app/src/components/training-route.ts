import type { TrainingType } from '@contracts'

/** A type with no screen yet has no route, which is what makes its row unopenable. */
const SCREENS: Partial<Record<TrainingType, string>> = { chat: '/trainings', gaps: '/trainings/gaps' }

export const trainingRoute = (type: TrainingType, id: string) => {
  const screen = SCREENS[type]

  return screen ? `${screen}/${id}` : undefined
}

import type { TrainingStatus, TrainingType } from '@contracts'

/** A type with no screen yet has no route, which is what makes its row unopenable. */
const SCREENS: Partial<Record<TrainingType, string>> = {
  chat: 'trainings/[id]',
  gaps: 'trainings/gaps/[id]',
  describe: 'trainings/describe/[id]',
  smuggle: 'trainings/smuggle/[id]',
}

/** An ended session of any type opens read-only; only an active one goes back to the screen that plays it. */
export const trainingRoute = (type: TrainingType, id: string, status: TrainingStatus = 'ACTIVE') => {
  if (status !== 'ACTIVE') return `/trainings/history/${id}`
  const screen = SCREENS[type]

  return screen ? `/${screen.replace('[id]', id)}` : undefined
}

type StackRoute = { key: string; name: string; params?: object }

/** Home › Sessions › the new session, reusing Home and Sessions when they are already on the stack. */
export const sessionStack = (current: StackRoute[], type: TrainingType, id: string) => {
  const reuse = (name: string) => {
    const route = current.find((candidate) => candidate.name === name)
    return route ? { key: route.key, name, params: route.params } : { name }
  }
  const screen = SCREENS[type]

  return [reuse('index'), reuse('trainings/index'), ...(screen ? [{ name: screen, params: { id } }] : [])]
}

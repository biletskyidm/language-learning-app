const DAY_MS = 24 * 60 * 60 * 1000

const baseInterval = (timesPracticed: number): number => {
  if (timesPracticed <= 1) return 1
  if (timesPracticed === 2) return 3
  if (timesPracticed === 3) return 7
  if (timesPracticed === 4) return 14
  if (timesPracticed === 5) return 30

  return 30 * Math.pow(2, timesPracticed - 5)
}

export const nextTrainingAt = (timesPracticed: number, lastPracticedAt: Date | undefined, score: number): Date => {
  if (!lastPracticedAt) return new Date(0)

  const base = baseInterval(timesPracticed)
  let interval = base
  if (score <= 3) interval = 0
  else if (score <= 6) interval = base * 0.5
  else if (score >= 9) interval = base * 1.5

  return new Date(lastPracticedAt.getTime() + interval * DAY_MS)
}

export const averageScore = (oldAvg: number, newScore: number, count: number) =>
  (oldAvg * (count - 1) + newScore) / count

export const withRetry = async <T>(call: () => Promise<T>, { attempts }: { attempts: number }): Promise<T> => {
  let last: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await call()
    } catch (error) {
      last = error
    }
  }

  throw last
}

import type { CreateScenarioInput, Scenario, UpdateScenarioInput } from '@contracts'
import type { ScenarioRepository } from './repository'

export class InMemoryScenarioRepository implements ScenarioRepository {
  constructor(private readonly scenarios: Scenario[] = []) {}

  async list(userId: string): Promise<Scenario[]> {
    return this.scenarios.filter((scenario) => scenario.userId === userId)
  }

  async findById(userId: string, id: string): Promise<Scenario | undefined> {
    return this.scenarios.find((scenario) => scenario.userId === userId && scenario.id === id)
  }

  async create(userId: string, input: CreateScenarioInput, createdAt: Date): Promise<Scenario> {
    const created: Scenario = { id: crypto.randomUUID(), userId, createdAt, ...input }
    this.scenarios.push(created)

    return created
  }

  async update(userId: string, id: string, patch: UpdateScenarioInput): Promise<Scenario | undefined> {
    const index = this.scenarios.findIndex((scenario) => scenario.userId === userId && scenario.id === id)
    const current = this.scenarios[index]
    if (!current) return undefined

    const updated = { ...current, ...patch }
    this.scenarios[index] = updated

    return updated
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const index = this.scenarios.findIndex((scenario) => scenario.userId === userId && scenario.id === id)
    if (index < 0) return false

    this.scenarios.splice(index, 1)

    return true
  }
}

import type { TrainingType } from '@contracts'
import type { LlmGateway } from '../deps'
import { DescribeDrill } from './describe'
import { GapsDrill } from './gaps'
import type { DrillStrategy } from './strategy'

/** Keyed by training type: a lookup that misses is a session no drill can play. */
export const drillStrategies = (llm: LlmGateway): Partial<Record<TrainingType, DrillStrategy>> => ({
  gaps: new GapsDrill(llm),
  describe: new DescribeDrill(llm),
})

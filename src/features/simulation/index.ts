// Публичный API фичи «simulation».
export { Simulator } from "./lib/simulator"
export { useSimulationStore } from "./model/store"
export {
  type SimOptions,
  type SimSnapshot,
  type SimStats,
  type NodeRuntime,
  type SimPhase,
  DEFAULT_SIM_OPTIONS,
} from "./model/types"

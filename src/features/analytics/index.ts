// Публичный API фичи «analytics».
export { computeAnalytics } from "./lib/jackson"
export { useAnalyticsSync } from "./lib/use-analytics-sync"
export { useAnalyticsStore } from "./model/store"
export {
  type AnalyticsResult,
  type NodeAnalytics,
  EMPTY_ANALYTICS,
} from "./model/types"

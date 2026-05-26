import { create } from "zustand"
import { EMPTY_ANALYTICS, type AnalyticsResult } from "./types"

interface AnalyticsState {
  result: AnalyticsResult
  setResult: (result: AnalyticsResult) => void
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  result: EMPTY_ANALYTICS,
  setResult: (result) => set({ result }),
}))

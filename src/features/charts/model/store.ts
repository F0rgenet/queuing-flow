import { create } from "zustand"
import type { ChartSample } from "./types"

const MAX_SAMPLES_PER_NODE = 1000

interface ChartsState {
  /** История метрики по каждому узлу (накопленные заявки за прогон). */
  history: Record<string, ChartSample[]>
  pushSamples: (samples: Record<string, ChartSample>) => void
  clear: () => void
}

export const useChartsStore = create<ChartsState>((set) => ({
  history: {},

  pushSamples: (samples) =>
    set((s) => {
      const next: Record<string, ChartSample[]> = { ...s.history }
      for (const [nodeId, sample] of Object.entries(samples)) {
        const existing = next[nodeId] ?? []
        const last = existing[existing.length - 1]
        // Если новая точка совпадает с последней по t и value — пропускаем,
        // чтобы не плодить дублей при последовательных событиях одного шага.
        if (last && last.t === sample.t && last.value === sample.value) continue
        const arr = [...existing, sample]
        next[nodeId] = arr.length > MAX_SAMPLES_PER_NODE ? arr.slice(-MAX_SAMPLES_PER_NODE) : arr
      }
      return { history: next }
    }),

  clear: () => set({ history: {} }),
}))

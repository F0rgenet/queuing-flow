import { create } from "zustand"
import type { ChartSample } from "./types"

const MAX_SAMPLES_PER_NODE = 1000

interface ChartsState {
  /** История метрик по каждому узлу (за прогон симуляции). */
  history: Record<string, ChartSample[]>
  pushSamples: (samples: Record<string, ChartSample>) => void
  /** Полная очистка истории (вызывается на reset симуляции). */
  clear: () => void
  /** Очистить историю только одного узла (опция в окне графика). */
  clearNode: (nodeId: string) => void
}

export const useChartsStore = create<ChartsState>((set) => ({
  history: {},

  pushSamples: (samples) =>
    set((s) => {
      const next: Record<string, ChartSample[]> = { ...s.history }
      for (const [nodeId, sample] of Object.entries(samples)) {
        const existing = next[nodeId] ?? []
        const last = existing[existing.length - 1]
        // Полный дубликат предыдущей точки — пропускаем, чтобы не плодить мусор.
        if (
          last &&
          last.t === sample.t &&
          last.cumulative === sample.cumulative &&
          last.queue === sample.queue &&
          last.utilization === sample.utilization
        )
          continue
        const arr = [...existing, sample]
        next[nodeId] = arr.length > MAX_SAMPLES_PER_NODE ? arr.slice(-MAX_SAMPLES_PER_NODE) : arr
      }
      return { history: next }
    }),

  clear: () => set({ history: {} }),

  clearNode: (nodeId) =>
    set((s) => {
      if (!s.history[nodeId]) return s
      const next = { ...s.history }
      delete next[nodeId]
      return { history: next }
    }),
}))

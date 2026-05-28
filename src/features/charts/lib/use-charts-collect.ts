import { useEffect } from "react"
import { useSimulationStore } from "@/features/simulation"
import { useChartsStore } from "../model/store"
import type { ChartSample } from "../model/types"

/**
 * Подписывается на симуляцию и собирает по каждому узлу точку с тремя
 * метриками (cumulative / queue / utilization) на каждый снапшот. История
 * очищается при сбросе симуляции.
 */
export function useChartsCollect() {
  useEffect(() => {
    const unsub = useSimulationStore.subscribe((state, prev) => {
      if (state.snapshot === null && prev.snapshot !== null) {
        useChartsStore.getState().clear()
        return
      }
      if (!state.snapshot || state.snapshot === prev.snapshot) return

      const t = state.snapshot.stats.time
      const samples: Record<string, ChartSample> = {}
      for (const [nodeId, rt] of Object.entries(state.snapshot.byNode)) {
        samples[nodeId] = {
          t,
          cumulative: rt.processed,
          queue: rt.queueLength,
          utilization: rt.utilization,
        }
      }
      useChartsStore.getState().pushSamples(samples)
    })
    return unsub
  }, [])
}

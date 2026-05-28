import { useEffect } from "react"
import { useSimulationStore } from "@/features/simulation"
import { useChartsStore } from "../model/store"
import type { ChartSample } from "../model/types"

/**
 * Подписывается на стор симуляции и собирает кумулятивную метрику
 * (число созданных / обработанных / полученных заявок) по каждому узлу.
 * История очищается при сбросе симуляции.
 */
export function useChartsCollect() {
  useEffect(() => {
    const unsub = useSimulationStore.subscribe((state, prev) => {
      // Сброс: snapshot стал null — очищаем накопленную историю.
      if (state.snapshot === null && prev.snapshot !== null) {
        useChartsStore.getState().clear()
        return
      }

      if (!state.snapshot || state.snapshot === prev.snapshot) return

      const t = state.snapshot.stats.time
      const samples: Record<string, ChartSample> = {}
      for (const [nodeId, rt] of Object.entries(state.snapshot.byNode)) {
        samples[nodeId] = { t, value: rt.processed }
      }
      useChartsStore.getState().pushSamples(samples)
    })
    return unsub
  }, [])
}

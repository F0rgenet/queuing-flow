import { useEffect } from "react"
import { useProcessStore } from "@/entities/process-model"
import { useAnalyticsStore } from "../model/store"
import { computeAnalytics } from "./jackson"

const DEBOUNCE_MS = 150

/**
 * Фоновый аналитический расчёт (ТЗ §6, FR-16): подписывается на изменения
 * графа и пересчитывает показатели с дебаунсом 150 мс.
 */
export function useAnalyticsSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const recompute = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const model = useProcessStore.getState().getModel()
        useAnalyticsStore.getState().setResult(computeAnalytics(model))
      }, DEBOUNCE_MS)
    }

    recompute() // первичный расчёт
    const unsubscribe = useProcessStore.subscribe((state, prev) => {
      if (
        state.nodes !== prev.nodes ||
        state.edges !== prev.edges ||
        state.meta !== prev.meta
      ) {
        recompute()
      }
    })

    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [])
}

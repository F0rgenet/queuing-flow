import { useAnalyticsStore } from "@/features/analytics"
import { useSimulationStore } from "@/features/simulation"
import { loadStatus, type LoadStatus } from "@/shared/config/status"

export interface NodeMetrics {
  source: "analytics" | "simulation"
  load: number // ρ или utilization
  status: LoadStatus
  queue: number // длина очереди (Lq или текущая)
  Wq: number
  W: number
  throughput: number
  channels: number | null
  /** доп. показатели симуляции */
  processed?: number
  dropped?: number
  stable: boolean
}

/**
 * Единый источник отображаемых метрик узла: показывает результаты симуляции,
 * если прогон запущен, иначе — аналитический расчёт (ТЗ FR-18).
 */
export function useNodeMetrics(nodeId: string): NodeMetrics | null {
  const analytics = useAnalyticsStore((s) => s.result.byNode[nodeId])
  const phase = useSimulationStore((s) => s.phase)
  const sim = useSimulationStore((s) => s.snapshot?.byNode[nodeId])

  if (phase !== "idle" && sim) {
    return {
      source: "simulation",
      load: sim.utilization,
      status: loadStatus(sim.utilization),
      queue: sim.queueLength,
      Wq: analytics?.Wq ?? 0,
      W: analytics?.W ?? 0,
      throughput: sim.processed,
      channels: sim.channels,
      processed: sim.processed,
      dropped: sim.dropped,
      stable: sim.utilization < 1,
    }
  }

  if (!analytics) return null
  return {
    source: "analytics",
    load: analytics.rho,
    status: analytics.status,
    queue: analytics.Lq,
    Wq: analytics.Wq,
    W: analytics.W,
    throughput: analytics.throughput,
    channels: analytics.channels,
    stable: analytics.stable,
  }
}

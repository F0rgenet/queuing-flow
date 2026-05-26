import type { LoadStatus } from "@/shared/config/status"

/** Расчётные показатели одного узла (ТЗ §2.2, §6). */
export interface NodeAnalytics {
  nodeId: string
  lambda: number // эффективная интенсивность потока λ
  mu: number | null // интенсивность обслуживания μ (для операций)
  channels: number | null // число каналов c
  rho: number // загрузка ρ = λ/(c·μ)
  Lq: number // средняя длина очереди
  L: number // среднее число в системе
  Wq: number // среднее время ожидания
  W: number // среднее время в системе
  throughput: number // пропускная способность (выходной поток)
  status: LoadStatus
  stable: boolean
}

export interface AnalyticsResult {
  byNode: Record<string, NodeAnalytics>
  systemStable: boolean
  /** id узла с максимальной загрузкой — «узкое место». */
  bottleneckId: string | null
  /** true, если расчёт невозможен (есть ошибки валидации). */
  unavailable: boolean
}

export const EMPTY_ANALYTICS: AnalyticsResult = {
  byNode: {},
  systemStable: true,
  bottleneckId: null,
  unavailable: true,
}

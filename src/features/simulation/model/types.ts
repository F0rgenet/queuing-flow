/** Runtime-типы имитационной модели (ТЗ §7). Не входят в сохраняемую модель. */

export interface SimOptions {
  seed: number
  maxTime: number
  maxTransactions: number
}

export const DEFAULT_SIM_OPTIONS: SimOptions = {
  seed: 12345,
  maxTime: 1000,
  maxTransactions: 5000,
}

/** Заявка, движущаяся по карте процесса. */
export interface Transaction {
  id: number
  createdAt: number
  /** Счётчики проходов по каждой дуге — для соблюдения max_loops. */
  loops: Record<string, number>
}

/** Снимок состояния узла для отрисовки. */
export interface NodeRuntime {
  nodeId: string
  queueLength: number
  busyChannels: number
  channels: number
  utilization: number // средняя загрузка каналов за прогон
  avgQueue: number // средняя длина очереди за прогон
  maxQueue: number
  processed: number
  dropped: number
}

/** Итоговая/текущая статистика прогона (ТЗ §7.5). */
export interface SimStats {
  time: number
  generated: number
  completed: number
  dropped: number
  inSystem: number
  avgSojourn: number // среднее время в системе (по завершённым)
  bottleneckId: string | null // узел с макс. средней очередью
}

export interface SimSnapshot {
  byNode: Record<string, NodeRuntime>
  stats: SimStats
  finished: boolean
}

export interface StepResult {
  traversedEdges: string[]
  finished: boolean
}

export type SimPhase = "idle" | "running" | "paused" | "finished"

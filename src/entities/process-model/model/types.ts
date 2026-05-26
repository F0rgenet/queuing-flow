/**
 * Доменная модель процесса (ТЗ §4).
 * Граф — единственный источник истины; Canvas и JSON суть его представления.
 * AnalyticsResult и runtime-симуляции НЕ входят в сохраняемую модель.
 */

export type NodeType = "source" | "operation" | "sink"
export type EdgeType = "direct" | "condition"
export type Distribution = "exponential" | "deterministic" | "uniform" | "normal"
export type Discipline = "FIFO" | "LIFO" | "priority"
export type TimeUnit = "sec" | "min" | "hour"

export interface Position {
  x: number
  y: number
}

export interface SourceParameters {
  input_rate: number
  distribution: Distribution
  limit: number | null
  start_at: number
}

export interface OperationParameters {
  service_rate: number
  channels: number
  service_distribution: Distribution
  queue_capacity: number | null
  discipline: Discipline
}

export type SinkParameters = Record<string, never>

export type NodeParameters =
  | SourceParameters
  | OperationParameters
  | SinkParameters

export interface ProcessNode {
  id: string
  type: NodeType
  label: string
  position: Position
  parameters: NodeParameters
}

export interface EdgeParameters {
  probability?: number
  max_loops?: number | null
  priority?: number
}

export interface ProcessEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  parameters?: EdgeParameters
}

export interface ProcessMeta {
  title: string
  description: string
  timeUnit: TimeUnit
}

export interface ProcessModel {
  version: string
  meta: ProcessMeta
  nodes: ProcessNode[]
  edges: ProcessEdge[]
}

/** Узкие типы-предикаты — удобны при работе с параметрами по типу узла. */
export function isSource(node: ProcessNode): node is ProcessNode & {
  parameters: SourceParameters
} {
  return node.type === "source"
}

export function isOperation(node: ProcessNode): node is ProcessNode & {
  parameters: OperationParameters
} {
  return node.type === "operation"
}

export function isSink(node: ProcessNode): boolean {
  return node.type === "sink"
}

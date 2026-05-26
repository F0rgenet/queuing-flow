import type {
  NodeType,
  NodeParameters,
  OperationParameters,
  ProcessModel,
  SourceParameters,
} from "./types"

export const MODEL_VERSION = "1.0"

export const DEFAULT_SOURCE_PARAMS: SourceParameters = {
  input_rate: 10,
  distribution: "exponential",
  limit: null,
  start_at: 0,
}

export const DEFAULT_OPERATION_PARAMS: OperationParameters = {
  service_rate: 15,
  channels: 1,
  service_distribution: "exponential",
  queue_capacity: null,
  discipline: "FIFO",
}

export function defaultParams(type: NodeType): NodeParameters {
  if (type === "source") return { ...DEFAULT_SOURCE_PARAMS }
  if (type === "operation") return { ...DEFAULT_OPERATION_PARAMS }
  return {}
}

export const NODE_LABELS: Record<NodeType, string> = {
  source: "Источник",
  operation: "Операция",
  sink: "Сток",
}

/** Демонстрационный процесс из ТЗ (Приложение A): ветвление + цикл + обратная связь. */
export const SAMPLE_MODEL: ProcessModel = {
  version: MODEL_VERSION,
  meta: {
    title: "Линия сборки",
    description: "Демонстрационный процесс с контролем качества и доработкой",
    timeUnit: "min",
  },
  nodes: [
    {
      id: "node_source1",
      type: "source",
      label: "Склад 1",
      position: { x: 40, y: 180 },
      parameters: { ...DEFAULT_SOURCE_PARAMS, input_rate: 10 },
    },
    {
      id: "node_t1",
      type: "operation",
      label: "Операция Т1",
      position: { x: 300, y: 180 },
      parameters: { ...DEFAULT_OPERATION_PARAMS, service_rate: 15, channels: 1 },
    },
    {
      id: "node_qc",
      type: "operation",
      label: "Контроль",
      position: { x: 560, y: 80 },
      parameters: { ...DEFAULT_OPERATION_PARAMS, service_rate: 20, channels: 2 },
    },
    {
      id: "node_t3",
      type: "operation",
      label: "Операция Т3",
      position: { x: 560, y: 300 },
      parameters: { ...DEFAULT_OPERATION_PARAMS, service_rate: 12, channels: 1 },
    },
    {
      id: "node_sink1",
      type: "sink",
      label: "Готово",
      position: { x: 860, y: 180 },
      parameters: {},
    },
  ],
  edges: [
    { id: "edge_s_t1", source: "node_source1", target: "node_t1", type: "direct" },
    { id: "edge_t1_qc", source: "node_t1", target: "node_qc", type: "direct" },
    {
      id: "edge_qc_sink",
      source: "node_qc",
      target: "node_sink1",
      type: "condition",
      parameters: { probability: 0.8 },
    },
    {
      id: "edge_qc_t1",
      source: "node_qc",
      target: "node_t1",
      type: "condition",
      parameters: { probability: 0.2, max_loops: 3 },
    },
    { id: "edge_t1_t3", source: "node_t1", target: "node_t3", type: "direct" },
    {
      id: "edge_t3_t1",
      source: "node_t3",
      target: "node_t1",
      type: "condition",
      parameters: { probability: 0.4, max_loops: 2 },
    },
    {
      id: "edge_t3_sink",
      source: "node_t3",
      target: "node_sink1",
      type: "condition",
      parameters: { probability: 0.6 },
    },
  ],
}

export function emptyModel(): ProcessModel {
  return {
    version: MODEL_VERSION,
    meta: { title: "Новый процесс", description: "", timeUnit: "min" },
    nodes: [],
    edges: [],
  }
}

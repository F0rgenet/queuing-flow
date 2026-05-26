import { MODEL_VERSION } from "../model/defaults"
import type {
  EdgeType,
  NodeType,
  ProcessEdge,
  ProcessModel,
  ProcessNode,
} from "../model/types"

export type ParseResult =
  | { ok: true; model: ProcessModel }
  | { ok: false; error: string; line?: number }

const NODE_TYPES: NodeType[] = ["source", "operation", "sink"]
const EDGE_TYPES: EdgeType[] = ["direct", "condition"]

/** Модель → форматированный JSON (порядок ключей фиксирован для стабильного diff). */
export function serialize(model: ProcessModel): string {
  const ordered: ProcessModel = {
    version: model.version ?? MODEL_VERSION,
    meta: model.meta,
    nodes: model.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      parameters: n.parameters,
    })),
    edges: model.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      ...(e.parameters ? { parameters: e.parameters } : {}),
    })),
  }
  return JSON.stringify(ordered, null, 2)
}

/** JSON-текст → модель с проверкой формы (ТЗ §10, V-01/V-02). */
export function parse(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: `Синтаксическая ошибка JSON: ${(e as Error).message}` }
  }

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Корень конфигурации должен быть объектом" }
  }
  const obj = raw as Record<string, unknown>

  if (!Array.isArray(obj.nodes)) return { ok: false, error: "Поле `nodes` должно быть массивом" }
  if (!Array.isArray(obj.edges)) return { ok: false, error: "Поле `edges` должно быть массивом" }

  const nodes: ProcessNode[] = []
  for (const [i, item] of obj.nodes.entries()) {
    const node = parseNode(item, i)
    if (typeof node === "string") return { ok: false, error: node }
    nodes.push(node)
  }

  const edges: ProcessEdge[] = []
  for (const [i, item] of obj.edges.entries()) {
    const edge = parseEdge(item, i)
    if (typeof edge === "string") return { ok: false, error: edge }
    edges.push(edge)
  }

  const meta = (obj.meta as ProcessModel["meta"]) ?? {
    title: "Процесс",
    description: "",
    timeUnit: "min",
  }

  return {
    ok: true,
    model: {
      version: typeof obj.version === "string" ? obj.version : MODEL_VERSION,
      meta,
      nodes,
      edges,
    },
  }
}

function parseNode(item: unknown, i: number): ProcessNode | string {
  if (typeof item !== "object" || item === null) return `nodes[${i}]: ожидается объект`
  const n = item as Record<string, unknown>
  if (typeof n.id !== "string") return `nodes[${i}]: отсутствует строковый id`
  if (!NODE_TYPES.includes(n.type as NodeType))
    return `nodes[${i}] (${n.id}): недопустимый type «${String(n.type)}»`
  const pos = n.position as Record<string, unknown> | undefined
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number")
    return `nodes[${i}] (${n.id}): position {x,y} обязателен`
  return {
    id: n.id,
    type: n.type as NodeType,
    label: typeof n.label === "string" ? n.label : n.id,
    position: { x: pos.x, y: pos.y },
    parameters: (n.parameters as ProcessNode["parameters"]) ?? {},
  }
}

function parseEdge(item: unknown, i: number): ProcessEdge | string {
  if (typeof item !== "object" || item === null) return `edges[${i}]: ожидается объект`
  const e = item as Record<string, unknown>
  if (typeof e.id !== "string") return `edges[${i}]: отсутствует строковый id`
  if (typeof e.source !== "string" || typeof e.target !== "string")
    return `edges[${i}] (${e.id}): source и target обязательны`
  const type = EDGE_TYPES.includes(e.type as EdgeType) ? (e.type as EdgeType) : "direct"
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type,
    parameters: e.parameters as ProcessEdge["parameters"],
  }
}

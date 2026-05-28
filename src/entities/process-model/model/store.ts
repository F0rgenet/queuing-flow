import { create } from "zustand"
import { makeId } from "@/shared/lib/id"
import { validateModel, type ValidationReport } from "../lib/validator"
import { defaultParams, emptyModel, NODE_LABELS, SAMPLE_MODEL } from "./defaults"
import type {
  ChartWindow,
  NodeParameters,
  NodeType,
  Position,
  ProcessEdge,
  ProcessMeta,
  ProcessModel,
  ProcessNode,
} from "./types"

const HISTORY_LIMIT = 100

interface HistoryEntry {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  meta: ProcessMeta
}

interface ProcessState {
  version: string
  meta: ProcessMeta
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  charts: ChartWindow[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  validation: ValidationReport

  past: HistoryEntry[]
  future: HistoryEntry[]

  // --- селекторы ---
  getModel: () => ProcessModel

  // --- мутации графа ---
  addNode: (type: NodeType, position: Position) => string
  updateNodePosition: (id: string, position: Position) => void
  updateNodeLabel: (id: string, label: string) => void
  updateNodeParams: (id: string, params: Partial<NodeParameters>) => void
  removeNode: (id: string) => void
  addEdge: (source: string, target: string) => string | null
  updateEdge: (id: string, patch: Partial<ProcessEdge>) => void
  removeEdge: (id: string) => void

  // --- окна графиков ---
  openChart: (nodeId: string, position: Position) => string
  closeChart: (id: string) => void
  moveChart: (id: string, position: Position) => void
  toggleChart: (nodeId: string, fallbackPosition: Position) => void

  // --- выделение ---
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void

  // --- модель целиком (из JSON / файла / шаблона) ---
  replaceModel: (model: ProcessModel, recordHistory?: boolean) => void
  setMeta: (patch: Partial<ProcessMeta>) => void
  reset: () => void

  // --- история ---
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

function snapshot(s: ProcessState): HistoryEntry {
  return { nodes: s.nodes, edges: s.edges, meta: s.meta }
}

function revalidate(nodes: ProcessNode[], edges: ProcessEdge[], meta: ProcessMeta) {
  return validateModel({ version: "1.0", meta, nodes, edges })
}

export const useProcessStore = create<ProcessState>((set, get) => {
  /** Применить изменение графа с записью истории и ревалидацией. */
  const commit = (
    updater: (s: ProcessState) => Pick<ProcessState, "nodes" | "edges" | "meta">
  ) => {
    set((s) => {
      const next = updater(s)
      const past = [...s.past, snapshot(s)].slice(-HISTORY_LIMIT)
      return {
        ...next,
        past,
        future: [],
        validation: revalidate(next.nodes, next.edges, next.meta),
      }
    })
  }

  return {
    version: SAMPLE_MODEL.version,
    meta: SAMPLE_MODEL.meta,
    nodes: SAMPLE_MODEL.nodes,
    edges: SAMPLE_MODEL.edges,
    charts: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    validation: validateModel(SAMPLE_MODEL),
    past: [],
    future: [],

    getModel: () => {
      const s = get()
      return {
        version: s.version,
        meta: s.meta,
        nodes: s.nodes,
        edges: s.edges,
        ...(s.charts.length > 0 ? { charts: s.charts } : {}),
      }
    },

    addNode: (type, position) => {
      const id = makeId(`node_${type}`)
      const count = get().nodes.filter((n) => n.type === type).length + 1
      const node: ProcessNode = {
        id,
        type,
        label: `${NODE_LABELS[type]} ${count}`,
        position,
        parameters: defaultParams(type),
      }
      commit((s) => ({ nodes: [...s.nodes, node], edges: s.edges, meta: s.meta }))
      return id
    },

    updateNodePosition: (id, position) => {
      // Перемещение фиксируем без записи в историю на каждый кадр —
      // история пишется при добавлении/удалении/смене параметров.
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
      }))
    },

    updateNodeLabel: (id, label) =>
      commit((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
        edges: s.edges,
        meta: s.meta,
      })),

    updateNodeParams: (id, params) =>
      commit((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id
            ? ({ ...n, parameters: { ...n.parameters, ...params } } as ProcessNode)
            : n
        ),
        edges: s.edges,
        meta: s.meta,
      })),

    removeNode: (id) => {
      // Удалить окна графиков, связанные с удаляемым узлом.
      set((s) => ({ charts: s.charts.filter((c) => c.nodeId !== id) }))
      commit((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.source !== id && e.target !== id),
        meta: s.meta,
      }))
    },

    addEdge: (source, target) => {
      if (source === target) return null
      const exists = get().edges.some((e) => e.source === source && e.target === target)
      if (exists) return null
      const id = makeId("edge")
      const edge: ProcessEdge = { id, source, target, type: "direct" }
      commit((s) => ({ nodes: s.nodes, edges: [...s.edges, edge], meta: s.meta }))
      return id
    },

    updateEdge: (id, patch) =>
      commit((s) => ({
        nodes: s.nodes,
        edges: s.edges.map((e) => (e.id === id ? normalizeEdge({ ...e, ...patch }) : e)),
        meta: s.meta,
      })),

    removeEdge: (id) =>
      commit((s) => ({
        nodes: s.nodes,
        edges: s.edges.filter((e) => e.id !== id),
        meta: s.meta,
      })),

    openChart: (nodeId, position) => {
      const id = makeId("chart")
      const colorIndex = nextColorIndex(get().charts)
      set((s) => ({ charts: [...s.charts, { id, nodeId, position, colorIndex }] }))
      return id
    },

    closeChart: (id) => set((s) => ({ charts: s.charts.filter((c) => c.id !== id) })),

    moveChart: (id, position) =>
      set((s) => ({
        charts: s.charts.map((c) => (c.id === id ? { ...c, position } : c)),
      })),

    toggleChart: (nodeId, fallbackPosition) => {
      const existing = get().charts.find((c) => c.nodeId === nodeId)
      if (existing) set((s) => ({ charts: s.charts.filter((c) => c.id !== existing.id) }))
      else {
        const id = makeId("chart")
        const colorIndex = nextColorIndex(get().charts)
        set((s) => ({
          charts: [...s.charts, { id, nodeId, position: fallbackPosition, colorIndex }],
        }))
      }
    },

    selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
    selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

    replaceModel: (model, recordHistory = true) => {
      set((s) => {
        const nodeIds = new Set(model.nodes.map((n) => n.id))
        const charts = (model.charts ?? []).filter((c) => nodeIds.has(c.nodeId))
        return {
          version: model.version,
          meta: model.meta,
          nodes: model.nodes,
          edges: model.edges,
          charts,
          past: recordHistory ? [...s.past, snapshot(s)].slice(-HISTORY_LIMIT) : s.past,
          future: recordHistory ? [] : s.future,
          validation: validateModel(model),
          // выделение очищаем, если выбранного узла больше нет
          selectedNodeId: model.nodes.some((n) => n.id === s.selectedNodeId)
            ? s.selectedNodeId
            : null,
          selectedEdgeId: model.edges.some((e) => e.id === s.selectedEdgeId)
            ? s.selectedEdgeId
            : null,
        }
      })
    },

    setMeta: (patch) =>
      commit((s) => ({ nodes: s.nodes, edges: s.edges, meta: { ...s.meta, ...patch } })),

    reset: () => get().replaceModel(emptyModel()),

    undo: () => {
      set((s) => {
        if (s.past.length === 0) return s
        const previous = s.past[s.past.length - 1]
        return {
          nodes: previous.nodes,
          edges: previous.edges,
          meta: previous.meta,
          past: s.past.slice(0, -1),
          future: [snapshot(s), ...s.future].slice(0, HISTORY_LIMIT),
          validation: revalidate(previous.nodes, previous.edges, previous.meta),
        }
      })
    },

    redo: () => {
      set((s) => {
        if (s.future.length === 0) return s
        const next = s.future[0]
        return {
          nodes: next.nodes,
          edges: next.edges,
          meta: next.meta,
          past: [...s.past, snapshot(s)].slice(-HISTORY_LIMIT),
          future: s.future.slice(1),
          validation: revalidate(next.nodes, next.edges, next.meta),
        }
      })
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  }
})

/** Берёт минимальный неиспользуемый colorIndex — стабильный цвет окна. */
function nextColorIndex(charts: ChartWindow[]): number {
  const used = new Set(charts.map((c) => c.colorIndex))
  let i = 0
  while (used.has(i)) i++
  return i
}

/** Согласование типа связи и её параметров. */
function normalizeEdge(edge: ProcessEdge): ProcessEdge {
  if (edge.type === "direct") {
    return { id: edge.id, source: edge.source, target: edge.target, type: "direct" }
  }
  return {
    ...edge,
    parameters: {
      probability: 0.5,
      max_loops: null,
      ...edge.parameters,
    },
  }
}

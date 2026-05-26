import { resolveOutgoing } from "./routing"
import {
  isOperation,
  isSource,
  type ProcessModel,
  type ProcessNode,
} from "../model/types"

export type IssueLevel = "error" | "warning"

export interface ValidationIssue {
  code: string
  level: IssueLevel
  message: string
  /** id связанного узла/связи — для подсветки в UI. */
  targetId?: string
}

export interface ValidationReport {
  issues: ValidationIssue[]
  hasErrors: boolean
}

const PROB_EPS = 1e-6

/** Полная структурная и параметрическая проверка модели (ТЗ §10). */
export function validateModel(model: ProcessModel): ValidationReport {
  const issues: ValidationIssue[] = []
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()

  // V-03: дубли id узлов
  for (const node of model.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        code: "V-03",
        level: "error",
        message: `Дублирующийся id узла: ${node.id}`,
        targetId: node.id,
      })
    }
    nodeIds.add(node.id)
    validateNodeParams(node, issues)
  }

  // V-03 / V-04: дубли дуг и висячие ссылки
  for (const edge of model.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        code: "V-03",
        level: "error",
        message: `Дублирующийся id связи: ${edge.id}`,
        targetId: edge.id,
      })
    }
    edgeIds.add(edge.id)

    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        code: "V-04",
        level: "error",
        message: `Связь ${edge.id} ссылается на несуществующий узел`,
        targetId: edge.id,
      })
    }
  }

  // V-05: сумма исходящих вероятностей ≈ 1 (для узлов с несколькими condition-дугами)
  for (const node of model.nodes) {
    const routes = resolveOutgoing(node.id, model.edges)
    if (routes.length === 0) continue
    const sum = routes.reduce((s, r) => s + r.probability, 0)
    if (Math.abs(sum - 1) > PROB_EPS) {
      issues.push({
        code: "V-05",
        level: "error",
        message: `Сумма исходящих вероятностей узла «${node.label}» = ${sum.toFixed(
          3
        )} (должна быть 1.0)`,
        targetId: node.id,
      })
    }
  }

  // V-06: источник без выхода / сток без входа
  for (const node of model.nodes) {
    const hasOut = model.edges.some((e) => e.source === node.id)
    const hasIn = model.edges.some((e) => e.target === node.id)
    if (node.type === "source" && !hasOut) {
      issues.push({
        code: "V-06",
        level: "warning",
        message: `Источник «${node.label}» не имеет исходящих связей`,
        targetId: node.id,
      })
    }
    if (node.type === "sink" && !hasIn) {
      issues.push({
        code: "V-06",
        level: "warning",
        message: `Сток «${node.label}» не имеет входящих связей`,
        targetId: node.id,
      })
    }
  }

  // V-07: недостижимость из источников
  const reachable = reachableFromSources(model)
  for (const node of model.nodes) {
    if (node.type !== "source" && !reachable.has(node.id)) {
      issues.push({
        code: "V-07",
        level: "warning",
        message: `Узел «${node.label}» недостижим из источника`,
        targetId: node.id,
      })
    }
  }

  // V-10: нет источника или стока
  if (!model.nodes.some((n) => n.type === "source")) {
    issues.push({
      code: "V-10",
      level: "warning",
      message: "В процессе нет источника заявок",
    })
  }
  if (!model.nodes.some((n) => n.type === "sink")) {
    issues.push({
      code: "V-10",
      level: "warning",
      message: "В процессе нет стока (выхода)",
    })
  }

  return { issues, hasErrors: issues.some((i) => i.level === "error") }
}

function validateNodeParams(node: ProcessNode, issues: ValidationIssue[]) {
  // V-09: некорректные числовые параметры
  if (isSource(node) && node.parameters.input_rate <= 0) {
    issues.push({
      code: "V-09",
      level: "error",
      message: `«${node.label}»: интенсивность входа должна быть > 0`,
      targetId: node.id,
    })
  }
  if (isOperation(node)) {
    if (node.parameters.service_rate <= 0) {
      issues.push({
        code: "V-09",
        level: "error",
        message: `«${node.label}»: интенсивность обслуживания должна быть > 0`,
        targetId: node.id,
      })
    }
    if (node.parameters.channels < 1 || !Number.isInteger(node.parameters.channels)) {
      issues.push({
        code: "V-09",
        level: "error",
        message: `«${node.label}»: число каналов должно быть целым ≥ 1`,
        targetId: node.id,
      })
    }
  }
}

function reachableFromSources(model: ProcessModel): Set<string> {
  const reachable = new Set<string>()
  const stack = model.nodes.filter((n) => n.type === "source").map((n) => n.id)
  while (stack.length > 0) {
    const id = stack.pop() as string
    for (const edge of model.edges) {
      if (edge.source === id && !reachable.has(edge.target)) {
        reachable.add(edge.target)
        stack.push(edge.target)
      }
    }
  }
  return reachable
}

import type { ProcessEdge } from "../model/types"

export interface ResolvedRoute {
  edge: ProcessEdge
  target: string
  probability: number
}

/**
 * Разрешение вероятностей исходящих дуг узла (ТЗ §4.4).
 * Дуги `condition` используют явную probability; дуги `direct` делят
 * остаток (1 − Σ condition) поровну. Возвращает нормированные маршруты.
 */
export function resolveOutgoing(
  nodeId: string,
  edges: ProcessEdge[]
): ResolvedRoute[] {
  const outgoing = edges.filter((e) => e.source === nodeId)
  if (outgoing.length === 0) return []

  const conditional = outgoing.filter((e) => e.type === "condition")
  const direct = outgoing.filter((e) => e.type === "direct")

  const conditionalSum = conditional.reduce(
    (sum, e) => sum + (e.parameters?.probability ?? 0),
    0
  )

  const remainder = Math.max(0, 1 - conditionalSum)
  const directShare = direct.length > 0 ? remainder / direct.length : 0

  return outgoing.map((edge) => ({
    edge,
    target: edge.target,
    probability:
      edge.type === "condition"
        ? edge.parameters?.probability ?? 0
        : directShare,
  }))
}

/** Сумма заявленных вероятностей исходящих дуг (для валидации §V-05). */
export function outgoingProbabilitySum(
  nodeId: string,
  edges: ProcessEdge[]
): number {
  return resolveOutgoing(nodeId, edges).reduce(
    (sum, r) => sum + r.probability,
    0
  )
}

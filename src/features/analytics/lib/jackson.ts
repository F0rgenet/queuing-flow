import {
  isOperation,
  isSource,
  resolveOutgoing,
  validateModel,
  type ProcessModel,
  type ProcessNode,
} from "@/entities/process-model"
import { factorial, solveLinearSystem } from "@/shared/lib/math"
import { loadStatus } from "@/shared/config/status"
import { EMPTY_ANALYTICS, type AnalyticsResult, type NodeAnalytics } from "../model/types"

/**
 * Аналитический расчёт открытой сети Джексона (ТЗ §6).
 * Чистая функция: модель → показатели. Без побочных эффектов.
 */
export function computeAnalytics(model: ProcessModel): AnalyticsResult {
  const report = validateModel(model)
  if (report.hasErrors) return { ...EMPTY_ANALYTICS, unavailable: true }

  const { nodes, edges } = model
  const operations = nodes.filter(isOperation)

  // p[i→j]: вероятность перехода с дуги i в j (суммируем параллельные дуги).
  const prob = (from: string, to: string): number =>
    resolveOutgoing(from, edges)
      .filter((r) => r.target === to)
      .reduce((s, r) => s + r.probability, 0)

  // Внешний приток γ в каждую операцию — от источников.
  const sources = nodes.filter(isSource)
  const gamma = operations.map((op) =>
    sources.reduce((s, src) => s + src.parameters.input_rate * prob(src.id, op.id), 0)
  )

  // Уравнения трафика: (I − Pᵀ)·λ = γ  →  M[j][i] = δ_ji − p_{i→j}.
  const n = operations.length
  const M: number[][] = Array.from({ length: n }, (_, j) =>
    Array.from({ length: n }, (_, i) => (i === j ? 1 : 0) - prob(operations[i].id, operations[j].id))
  )
  const lambdaVec = solveLinearSystem(M, gamma) ?? operations.map(() => 0)
  const lambdaByOp = new Map(operations.map((op, i) => [op.id, Math.max(0, lambdaVec[i])]))

  const byNode: Record<string, NodeAnalytics> = {}
  let systemStable = true
  let bottleneckId: string | null = null
  let maxRho = -1

  for (const node of nodes) {
    const analytics = computeNode(node, lambdaByOp, model)
    byNode[node.id] = analytics
    if (!analytics.stable) systemStable = false
    if (node.type === "operation" && analytics.rho > maxRho) {
      maxRho = analytics.rho
      bottleneckId = node.id
    }
  }

  return { byNode, systemStable, bottleneckId, unavailable: false }
}

function computeNode(
  node: ProcessNode,
  lambdaByOp: Map<string, number>,
  model: ProcessModel
): NodeAnalytics {
  if (isSource(node)) {
    const rate = node.parameters.input_rate
    return base(node.id, rate, rate)
  }

  if (isOperation(node)) {
    const lambda = lambdaByOp.get(node.id) ?? 0
    const mu = node.parameters.service_rate
    const c = node.parameters.channels
    return mmc(node.id, lambda, mu, c)
  }

  // sink: входящий поток = сумма исходящих потоков предшественников по их дугам.
  const incoming = incomingLambda(node.id, lambdaByOp, model)
  return base(node.id, incoming, incoming)
}

function incomingLambda(
  nodeId: string,
  lambdaByOp: Map<string, number>,
  model: ProcessModel
): number {
  let total = 0
  for (const node of model.nodes) {
    const out = lambdaByOp.get(node.id) ?? (node.type === "source" && isSource(node) ? node.parameters.input_rate : 0)
    const routes = resolveOutgoing(node.id, model.edges).filter((r) => r.target === nodeId)
    for (const r of routes) total += out * r.probability
  }
  return total
}

/** Узел без обслуживания (источник/сток): только проброс потока. */
function base(nodeId: string, lambda: number, throughput: number): NodeAnalytics {
  return {
    nodeId,
    lambda,
    mu: null,
    channels: null,
    rho: 0,
    Lq: 0,
    L: 0,
    Wq: 0,
    W: 0,
    throughput,
    status: "ok",
    stable: true,
  }
}

/** Метрики модели M/M/c (ТЗ §2.2). */
function mmc(nodeId: string, lambda: number, mu: number, c: number): NodeAnalytics {
  const a = lambda / mu
  const rho = a / c

  if (rho >= 1 || !Number.isFinite(rho)) {
    return {
      nodeId,
      lambda,
      mu,
      channels: c,
      rho: Number.isFinite(rho) ? rho : Infinity,
      Lq: Infinity,
      L: Infinity,
      Wq: Infinity,
      W: Infinity,
      throughput: lambda,
      status: "overloaded",
      stable: false,
    }
  }

  if (lambda === 0) {
    return {
      nodeId,
      lambda: 0,
      mu,
      channels: c,
      rho: 0,
      Lq: 0,
      L: 0,
      Wq: 0,
      W: 1 / mu,
      throughput: 0,
      status: "ok",
      stable: true,
    }
  }

  let sum = 0
  for (let k = 0; k < c; k++) sum += a ** k / factorial(k)
  const lastTerm = a ** c / (factorial(c) * (1 - rho))
  const P0 = 1 / (sum + lastTerm)
  const Pwait = lastTerm * P0
  const Lq = (Pwait * rho) / (1 - rho)
  const Wq = Lq / lambda
  const W = Wq + 1 / mu
  const L = Lq + a

  return {
    nodeId,
    lambda,
    mu,
    channels: c,
    rho,
    Lq,
    L,
    Wq,
    W,
    throughput: lambda,
    status: loadStatus(rho),
    stable: true,
  }
}

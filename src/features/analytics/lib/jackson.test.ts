import { expect, test } from "bun:test"
import type { ProcessModel } from "@/entities/process-model"
import { computeAnalytics } from "./jackson"

function chain(gamma: number, mu: number, channels: number): ProcessModel {
  return {
    version: "1.0",
    meta: { title: "t", description: "", timeUnit: "min" },
    nodes: [
      { id: "s", type: "source", label: "S", position: { x: 0, y: 0 }, parameters: { input_rate: gamma, distribution: "exponential", limit: null, start_at: 0 } },
      { id: "op", type: "operation", label: "Op", position: { x: 1, y: 0 }, parameters: { service_rate: mu, channels, service_distribution: "exponential", queue_capacity: null, discipline: "FIFO" } },
      { id: "k", type: "sink", label: "K", position: { x: 2, y: 0 }, parameters: {} },
    ],
    edges: [
      { id: "e1", source: "s", target: "op", type: "direct" },
      { id: "e2", source: "op", target: "k", type: "direct" },
    ],
  }
}

test("M/M/1: ρ, Lq, Wq, W по эталонным формулам", () => {
  const r = computeAnalytics(chain(10, 15, 1))
  const op = r.byNode.op
  expect(op.lambda).toBeCloseTo(10, 6)
  expect(op.rho).toBeCloseTo(10 / 15, 6) // 0.6667
  expect(op.Lq).toBeCloseTo((0.6667 ** 2) / (1 - 0.6667), 2) // ≈1.333
  expect(op.Wq).toBeCloseTo(op.Lq / 10, 6)
  expect(op.W).toBeCloseTo(op.Wq + 1 / 15, 6)
  expect(r.systemStable).toBe(true)
})

test("Нестабильность: γ > μ → ρ≥1, метрики ∞", () => {
  const r = computeAnalytics(chain(20, 15, 1))
  expect(r.byNode.op.stable).toBe(false)
  expect(r.byNode.op.Wq).toBe(Infinity)
  expect(r.systemStable).toBe(false)
})

test("M/M/c: два канала снижают загрузку вдвое", () => {
  const r1 = computeAnalytics(chain(10, 15, 1))
  const r2 = computeAnalytics(chain(10, 15, 2))
  expect(r2.byNode.op.rho).toBeCloseTo(r1.byNode.op.rho / 2, 6)
  expect(r2.byNode.op.Lq).toBeLessThan(r1.byNode.op.Lq)
})

test("Ветвление: вероятности делят поток между ветвями", () => {
  const model: ProcessModel = {
    version: "1.0",
    meta: { title: "t", description: "", timeUnit: "min" },
    nodes: [
      { id: "s", type: "source", label: "S", position: { x: 0, y: 0 }, parameters: { input_rate: 10, distribution: "exponential", limit: null, start_at: 0 } },
      { id: "a", type: "operation", label: "A", position: { x: 1, y: 0 }, parameters: { service_rate: 100, channels: 1, service_distribution: "exponential", queue_capacity: null, discipline: "FIFO" } },
      { id: "b", type: "operation", label: "B", position: { x: 2, y: 0 }, parameters: { service_rate: 100, channels: 1, service_distribution: "exponential", queue_capacity: null, discipline: "FIFO" } },
      { id: "k", type: "sink", label: "K", position: { x: 3, y: 0 }, parameters: {} },
    ],
    edges: [
      { id: "e1", source: "s", target: "a", type: "direct" },
      { id: "e2", source: "a", target: "b", type: "condition", parameters: { probability: 0.3 } },
      { id: "e3", source: "a", target: "k", type: "condition", parameters: { probability: 0.7 } },
      { id: "e4", source: "b", target: "k", type: "direct" },
    ],
  }
  const r = computeAnalytics(model)
  expect(r.byNode.a.lambda).toBeCloseTo(10, 6)
  expect(r.byNode.b.lambda).toBeCloseTo(3, 6) // 10 * 0.3
})

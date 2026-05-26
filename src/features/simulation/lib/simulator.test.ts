import { expect, test } from "bun:test"
import type { ProcessModel } from "@/entities/process-model"
import { Simulator } from "./simulator"

const model: ProcessModel = {
  version: "1.0",
  meta: { title: "t", description: "", timeUnit: "min" },
  nodes: [
    { id: "s", type: "source", label: "S", position: { x: 0, y: 0 }, parameters: { input_rate: 8, distribution: "exponential", limit: null, start_at: 0 } },
    { id: "op", type: "operation", label: "Op", position: { x: 1, y: 0 }, parameters: { service_rate: 15, channels: 1, service_distribution: "exponential", queue_capacity: null, discipline: "FIFO" } },
    { id: "k", type: "sink", label: "K", position: { x: 2, y: 0 }, parameters: {} },
  ],
  edges: [
    { id: "e1", source: "s", target: "op", type: "direct" },
    { id: "e2", source: "op", target: "k", type: "direct" },
  ],
}

test("Симуляция M/M/1: загрузка сходится к ρ=8/15, прогон завершается", () => {
  const sim = new Simulator(model, { seed: 42, maxTime: 100000, maxTransactions: 50000 })
  let guard = 0
  while (!sim.step().finished && guard < 5_000_000) guard++

  const snap = sim.snapshot()
  // Утилизация должна быть близка к аналитическому ρ ≈ 0.533 (±10%).
  expect(snap.byNode.op.utilization).toBeGreaterThan(0.45)
  expect(snap.byNode.op.utilization).toBeLessThan(0.62)
  expect(snap.stats.completed).toBeGreaterThan(40000)
  expect(snap.stats.dropped).toBe(0)
})

test("Баланс заявок: created = completed + dropped + inSystem; тупик считается потерей", () => {
  // Развилка: 50% в сток, 50% в операцию-тупик (без выхода) → должны теряться.
  const fork: ProcessModel = {
    version: "1.0",
    meta: { title: "t", description: "", timeUnit: "min" },
    nodes: [
      { id: "s", type: "source", label: "S", position: { x: 0, y: 0 }, parameters: { input_rate: 1, distribution: "deterministic", limit: 100, start_at: 0 } },
      { id: "a", type: "operation", label: "A", position: { x: 1, y: 0 }, parameters: { service_rate: 1000, channels: 1, service_distribution: "deterministic", queue_capacity: null, discipline: "FIFO" } },
      { id: "dead", type: "operation", label: "Dead", position: { x: 2, y: 1 }, parameters: { service_rate: 1000, channels: 1, service_distribution: "deterministic", queue_capacity: null, discipline: "FIFO" } },
      { id: "k", type: "sink", label: "K", position: { x: 2, y: 0 }, parameters: {} },
    ],
    edges: [
      { id: "e1", source: "s", target: "a", type: "direct" },
      { id: "e_k", source: "a", target: "k", type: "condition", parameters: { probability: 0.5 } },
      { id: "e_dead", source: "a", target: "dead", type: "condition", parameters: { probability: 0.5 } },
    ],
  }
  const sim = new Simulator(fork, { seed: 7, maxTime: 100000, maxTransactions: 200 })
  let guard = 0
  while (!sim.step().finished && guard < 1_000_000) guard++
  const snap = sim.snapshot()
  // Книги должны сходиться, и потерянные заявки (тупик) должны быть > 0.
  expect(snap.stats.completed + snap.stats.dropped + snap.stats.inSystem).toBe(snap.stats.generated)
  expect(snap.stats.dropped).toBeGreaterThan(0)
  expect(snap.byNode.k.processed).toBe(snap.stats.completed)
})

test("max_loops ограничивает число проходов по дуге обратной связи", () => {
  const loop: ProcessModel = {
    version: "1.0",
    meta: { title: "t", description: "", timeUnit: "min" },
    nodes: [
      { id: "s", type: "source", label: "S", position: { x: 0, y: 0 }, parameters: { input_rate: 1, distribution: "deterministic", limit: 5, start_at: 0 } },
      { id: "op", type: "operation", label: "Op", position: { x: 1, y: 0 }, parameters: { service_rate: 1000, channels: 1, service_distribution: "deterministic", queue_capacity: null, discipline: "FIFO" } },
      { id: "k", type: "sink", label: "K", position: { x: 2, y: 0 }, parameters: {} },
    ],
    edges: [
      { id: "e1", source: "s", target: "op", type: "direct" },
      // 100% возврат с лимитом 2 прохода, и выход в сток
      { id: "e_loop", source: "op", target: "op", type: "condition", parameters: { probability: 1, max_loops: 2 } },
      { id: "e_out", source: "op", target: "k", type: "condition", parameters: { probability: 0 } },
    ],
  }
  const sim = new Simulator(loop, { seed: 1, maxTime: 100000, maxTransactions: 100 })
  let guard = 0
  while (!sim.step().finished && guard < 1_000_000) guard++
  const snap = sim.snapshot()
  // 5 заявок должны дойти до стока, не зациклившись бесконечно.
  expect(snap.stats.completed).toBe(5)
})

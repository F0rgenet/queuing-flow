import {
  isOperation,
  isSource,
  resolveOutgoing,
  type OperationParameters,
  type ProcessModel,
  type ProcessNode,
} from "@/entities/process-model"
import { createRng, type Rng } from "./rng"
import { sampleInterval } from "./distributions"
import {
  type NodeRuntime,
  type SimOptions,
  type SimSnapshot,
  type StepResult,
  type Transaction,
} from "../model/types"

type EventType = "GENERATE" | "ARRIVE" | "SERVICE_END"

interface SimEvent {
  time: number
  type: EventType
  nodeId: string
  txId?: number
  /** Дуга, по которой заявка прибыла (для статистики/анимации). */
  edgeId?: string
}

interface OpRuntime {
  queue: Transaction[]
  busy: number
  areaQueue: number // ∫ queueLength dt
  areaBusy: number // ∫ busyChannels dt
  maxQueue: number
  processed: number
  dropped: number
}

/**
 * Дискретно-событийный симулятор сети массового обслуживания (ТЗ §7).
 * Управляется извне пошагово: `step()` обрабатывает одно событие.
 */
export class Simulator {
  private model: ProcessModel
  private options: SimOptions
  private rng: Rng
  private events: SimEvent[] = []
  private op = new Map<string, OpRuntime>()
  private txCounter = 0
  private generatedBySource = new Map<string, number>()

  time = 0
  private lastEventTime = 0
  generated = 0
  completed = 0
  dropped = 0
  inSystem = 0
  private sojournSum = 0
  finished = false

  constructor(model: ProcessModel, options: SimOptions) {
    this.model = model
    this.options = options
    this.rng = createRng(options.seed)

    for (const node of model.nodes) {
      if (isOperation(node)) {
        this.op.set(node.id, {
          queue: [],
          busy: 0,
          areaQueue: 0,
          areaBusy: 0,
          maxQueue: 0,
          processed: 0,
          dropped: 0,
        })
      } else if (node.type === "sink") {
        this.sinkReceived.set(node.id, 0)
      }
    }

    // Первичная генерация на каждом источнике.
    for (const node of model.nodes) {
      if (isSource(node)) {
        this.generatedBySource.set(node.id, 0)
        this.scheduleGeneration(node, node.parameters.start_at)
      }
    }
  }

  /** Обработать одно событие. Возвращает дуги, пройденные за шаг. */
  step(): StepResult {
    if (this.finished || this.events.length === 0) {
      this.finished = true
      return { traversedEdges: [], finished: true }
    }

    const event = this.popEvent()

    // Достигнут предел модельного времени?
    if (event.time > this.options.maxTime) {
      this.finished = true
      return { traversedEdges: [], finished: true }
    }

    // Интегрируем площади (среднее) за интервал dt по всем операциям.
    const dt = event.time - this.lastEventTime
    if (dt > 0) {
      for (const rt of this.op.values()) {
        rt.areaQueue += rt.queue.length * dt
        rt.areaBusy += rt.busy * dt
      }
      this.lastEventTime = event.time
    }
    this.time = event.time

    const traversed: string[] = []
    switch (event.type) {
      case "GENERATE":
        this.handleGenerate(event, traversed)
        break
      case "ARRIVE":
        this.handleArrive(event)
        break
      case "SERVICE_END":
        this.handleServiceEnd(event, traversed)
        break
    }

    if (this.events.length === 0) this.finished = true
    return { traversedEdges: traversed, finished: this.finished }
  }

  private node(id: string): ProcessNode | undefined {
    return this.model.nodes.find((n) => n.id === id)
  }

  private handleGenerate(event: SimEvent, traversed: string[]) {
    const source = this.node(event.nodeId)
    if (!source || !isSource(source)) return

    // Глобальный предел числа заявок за прогон (ТЗ SIM-8).
    if (this.generated >= this.options.maxTransactions) return

    const limit = source.parameters.limit
    const count = this.generatedBySource.get(source.id) ?? 0
    if (limit !== null && count >= limit) return

    // Создаём заявку и сразу маршрутизируем её из источника.
    const tx: Transaction = { id: this.txCounter++, createdAt: this.time, loops: {} }
    this.generated += 1
    this.inSystem += 1
    this.generatedBySource.set(source.id, count + 1)
    this.routeFrom(source.id, tx, traversed)

    // Планируем следующую генерацию.
    if (limit === null || count + 1 < limit) {
      this.scheduleGeneration(source, this.time)
    }
  }

  private handleArrive(event: SimEvent) {
    const node = this.node(event.nodeId)
    const tx = event.txId !== undefined ? this.findTx(event) : undefined
    if (!node) return

    if (node.type === "sink") {
      this.completed += 1
      this.inSystem -= 1
      this.sinkReceived.set(node.id, (this.sinkReceived.get(node.id) ?? 0) + 1)
      if (tx) {
        this.sojournSum += this.time - tx.createdAt
        this.transactionsInFlight.delete(tx.id)
      }
      return
    }

    if (isOperation(node) && tx) {
      const rt = this.op.get(node.id)
      if (!rt) return
      const p = node.parameters as OperationParameters

      if (rt.busy < p.channels) {
        this.startService(node, tx, rt)
      } else if (p.queue_capacity === null || rt.queue.length < p.queue_capacity) {
        this.enqueue(rt, tx, p.discipline)
        rt.maxQueue = Math.max(rt.maxQueue, rt.queue.length)
      } else {
        // Очередь переполнена — заявка теряется (ТЗ SIM-3).
        rt.dropped += 1
        this.dropped += 1
        this.inSystem -= 1
        this.transactionsInFlight.delete(tx.id)
      }
    }
  }

  private handleServiceEnd(event: SimEvent, traversed: string[]) {
    const node = this.node(event.nodeId)
    if (!node || !isOperation(node)) return
    const rt = this.op.get(node.id)
    if (!rt) return

    rt.busy -= 1
    rt.processed += 1
    const tx = event.txId !== undefined ? this.transactionsInFlight.get(event.txId) : undefined
    if (tx) this.routeFrom(node.id, tx, traversed)

    // Берём следующую заявку из очереди.
    if (rt.queue.length > 0) {
      const next = rt.queue.shift() as Transaction
      this.startService(node, next, rt)
    }
  }

  private startService(node: ProcessNode, tx: Transaction, rt: OpRuntime) {
    rt.busy += 1
    this.transactionsInFlight.set(tx.id, tx)
    const p = node.parameters as OperationParameters
    const duration = sampleInterval(p.service_distribution, p.service_rate, this.rng)
    this.pushEvent({
      time: this.time + duration,
      type: "SERVICE_END",
      nodeId: node.id,
      txId: tx.id,
    })
  }

  private enqueue(rt: OpRuntime, tx: Transaction, discipline: OperationParameters["discipline"]) {
    if (discipline === "LIFO") rt.queue.unshift(tx)
    else rt.queue.push(tx) // FIFO и priority (упрощённо) — в хвост
  }

  /**
   * Маршрутизация заявки из узла (ТЗ §7.3, SIM-1..3).
   * Учитывает:
   *  - явную потерю: если сумма исходящих вероятностей < 1, остаток (1−Σ) —
   *    вероятность выбытия заявки из системы (брак / уход);
   *  - max_loops: дуги, исчерпавшие лимит проходов, исключаются, поток
   *    перенормируется среди оставшихся;
   *  - тупик: если доступных дуг нет вовсе — заявка теряется.
   */
  private routeFrom(nodeId: string, tx: Transaction, traversed: string[]) {
    const all = resolveOutgoing(nodeId, this.model.edges)
    const authoredSum = all.reduce((s, r) => s + r.probability, 0)
    const lossProbability = Math.max(0, 1 - authoredSum)

    // Явная потеря части потока (остаток до 1.0).
    if (lossProbability > 0 && this.rng() < lossProbability) {
      this.loseTransaction(tx)
      return
    }

    // Дуги, ещё не исчерпавшие лимит петель.
    const available = all.filter((r) => {
      const max = r.edge.parameters?.max_loops
      if (max === undefined || max === null) return true
      return (tx.loops[r.edge.id] ?? 0) < max
    })

    if (available.length === 0) {
      // Тупик (нет исходящих дуг или все исчерпали лимит) — заявка теряется.
      this.loseTransaction(tx)
      return
    }

    // Розыгрыш среди доступных дуг пропорционально их вероятности.
    // Если у всех доступных p = 0 (остался единственный выход) — выбираем равновероятно.
    const availSum = available.reduce((s, r) => s + r.probability, 0)
    const pickTotal = availSum > 0 ? availSum : available.length
    let roll = this.rng() * pickTotal
    let chosen = available[available.length - 1]
    for (const r of available) {
      const weight = availSum > 0 ? r.probability : 1
      if (roll < weight) {
        chosen = r
        break
      }
      roll -= weight
    }

    tx.loops[chosen.edge.id] = (tx.loops[chosen.edge.id] ?? 0) + 1
    traversed.push(chosen.edge.id)
    this.transactionsInFlight.set(tx.id, tx)
    this.pushEvent({
      time: this.time,
      type: "ARRIVE",
      nodeId: chosen.target,
      txId: tx.id,
      edgeId: chosen.edge.id,
    })
  }

  /** Заявка покидает систему, не дойдя до стока (потеря). */
  private loseTransaction(tx: Transaction) {
    this.dropped += 1
    this.inSystem -= 1
    this.transactionsInFlight.delete(tx.id)
  }

  private transactionsInFlight = new Map<number, Transaction>()
  private sinkReceived = new Map<string, number>()
  private findTx(event: SimEvent): Transaction | undefined {
    return event.txId !== undefined ? this.transactionsInFlight.get(event.txId) : undefined
  }

  private scheduleGeneration(source: ProcessNode, after: number) {
    if (!isSource(source)) return
    const interval = sampleInterval(
      source.parameters.distribution,
      source.parameters.input_rate,
      this.rng
    )
    this.pushEvent({ time: after + interval, type: "GENERATE", nodeId: source.id })
  }

  // --- приоритетная очередь событий (вставка с бинарным поиском по времени) ---
  private pushEvent(event: SimEvent) {
    let lo = 0
    let hi = this.events.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.events[mid].time < event.time) lo = mid + 1
      else hi = mid
    }
    this.events.splice(lo, 0, event)
  }

  private popEvent(): SimEvent {
    return this.events.shift() as SimEvent
  }

  // --- снимок состояния для UI ---
  snapshot(): SimSnapshot {
    const byNode: Record<string, NodeRuntime> = {}
    let bottleneckId: string | null = null
    let maxAvgQueue = -1
    const t = this.time || 1

    for (const node of this.model.nodes) {
      if (!isOperation(node)) continue
      const rt = this.op.get(node.id)
      if (!rt) continue
      const c = node.parameters.channels
      const avgQueue = rt.areaQueue / t
      const utilization = rt.areaBusy / (c * t)
      byNode[node.id] = {
        nodeId: node.id,
        queueLength: rt.queue.length,
        busyChannels: rt.busy,
        channels: c,
        utilization,
        avgQueue,
        maxQueue: rt.maxQueue,
        processed: rt.processed,
        dropped: rt.dropped,
      }
      if (avgQueue > maxAvgQueue) {
        maxAvgQueue = avgQueue
        bottleneckId = node.id
      }
    }

    // Стоки: число полученных заявок (ТЗ §7.5).
    for (const node of this.model.nodes) {
      if (node.type !== "sink") continue
      byNode[node.id] = {
        nodeId: node.id,
        queueLength: 0,
        busyChannels: 0,
        channels: 0,
        utilization: 0,
        avgQueue: 0,
        maxQueue: 0,
        processed: this.sinkReceived.get(node.id) ?? 0,
        dropped: 0,
      }
    }

    // Источники: число сгенерированных заявок (для отображения на графиках).
    for (const node of this.model.nodes) {
      if (node.type !== "source") continue
      byNode[node.id] = {
        nodeId: node.id,
        queueLength: 0,
        busyChannels: 0,
        channels: 0,
        utilization: 0,
        avgQueue: 0,
        maxQueue: 0,
        processed: this.generatedBySource.get(node.id) ?? 0,
        dropped: 0,
      }
    }

    return {
      byNode,
      stats: {
        time: this.time,
        generated: this.generated,
        completed: this.completed,
        dropped: this.dropped,
        inSystem: this.inSystem,
        avgSojourn: this.completed > 0 ? this.sojournSum / this.completed : 0,
        bottleneckId,
      },
      finished: this.finished,
    }
  }
}

import { create } from "zustand"
import type { ProcessModel } from "@/entities/process-model"
import { Simulator } from "../lib/simulator"
import {
  DEFAULT_SIM_OPTIONS,
  type SimOptions,
  type SimPhase,
  type SimSnapshot,
} from "./types"

const TICK_MS = 60
const BASE_EVENTS_PER_TICK = 1
/** Сколько мс дуга считается «активной» после прохода заявки (для анимации). */
const ACTIVE_WINDOW_MS = 700

interface SimState {
  phase: SimPhase
  snapshot: SimSnapshot | null
  /** Дуги, по которым недавно прошли заявки — для анимации частиц. */
  activeEdges: string[]
  speed: number // множитель скорости 0.1–10
  options: SimOptions

  start: (model: ProcessModel) => void
  pause: () => void
  resume: () => void
  step: (model: ProcessModel) => void
  reset: () => void
  setSpeed: (speed: number) => void
  setOptions: (patch: Partial<SimOptions>) => void
}

// Контроллер вне реактивного состояния: симулятор, таймер и журнал активности дуг.
let simulator: Simulator | null = null
let timer: ReturnType<typeof setInterval> | null = null
let edgeLastSeen = new Map<string, number>()

export const useSimulationStore = create<SimState>((set, get) => {
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  /** Активные дуги = пройденные за окно ACTIVE_WINDOW_MS. */
  const computeActiveEdges = (traversed: string[]): string[] => {
    const now = Date.now()
    for (const id of traversed) edgeLastSeen.set(id, now)
    const active: string[] = []
    for (const [id, ts] of edgeLastSeen) {
      if (now - ts < ACTIVE_WINDOW_MS) active.push(id)
      else edgeLastSeen.delete(id)
    }
    return active
  }

  const runTick = () => {
    if (!simulator) return
    const count = Math.max(1, Math.round(BASE_EVENTS_PER_TICK * get().speed))
    const traversed: string[] = []
    let finished = false
    for (let i = 0; i < count && !finished; i++) {
      const res = simulator.step()
      traversed.push(...res.traversedEdges)
      finished = res.finished
    }
    set({
      snapshot: simulator.snapshot(),
      activeEdges: computeActiveEdges(traversed),
    })
    if (finished) {
      stopTimer()
      set({ phase: "finished", activeEdges: [] })
    }
  }

  return {
    phase: "idle",
    snapshot: null,
    activeEdges: [],
    speed: 1,
    options: { ...DEFAULT_SIM_OPTIONS },

    start: (model) => {
      stopTimer()
      edgeLastSeen = new Map()
      simulator = new Simulator(model, get().options)
      set({ phase: "running", snapshot: simulator.snapshot(), activeEdges: [] })
      timer = setInterval(runTick, TICK_MS)
    },

    pause: () => {
      stopTimer()
      if (get().phase === "running") set({ phase: "paused", activeEdges: [] })
    },

    resume: () => {
      if (!simulator || get().phase !== "paused") return
      set({ phase: "running" })
      timer = setInterval(runTick, TICK_MS)
    },

    step: (model) => {
      // Если прогон не начат — создаём симулятор «на паузе» и делаем один шаг.
      if (!simulator || get().phase === "idle" || get().phase === "finished") {
        stopTimer()
        edgeLastSeen = new Map()
        simulator = new Simulator(model, get().options)
      }
      const res = simulator.step()
      set({
        snapshot: simulator.snapshot(),
        activeEdges: computeActiveEdges(res.traversedEdges),
        phase: res.finished ? "finished" : "paused",
      })
    },

    reset: () => {
      stopTimer()
      simulator = null
      edgeLastSeen = new Map()
      set({ phase: "idle", snapshot: null, activeEdges: [] })
    },

    setSpeed: (speed) => set({ speed }),

    setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
  }
})

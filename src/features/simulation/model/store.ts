import { create } from "zustand"
import type { ProcessModel } from "@/entities/process-model"
import { Simulator } from "../lib/simulator"
import {
  DEFAULT_SIM_OPTIONS,
  type SimOptions,
  type SimPhase,
  type SimSnapshot,
} from "./types"

const TICK_MS = 50
const BASE_EVENTS_PER_TICK = 6

interface SimState {
  phase: SimPhase
  snapshot: SimSnapshot | null
  /** Дуги, по которым прошли заявки в последнем кадре — для анимации. */
  activeEdges: string[]
  speed: number // множитель скорости 0.1–10
  options: SimOptions

  start: (model: ProcessModel) => void
  pause: () => void
  resume: () => void
  stepOnce: () => void
  reset: () => void
  setSpeed: (speed: number) => void
  setOptions: (patch: Partial<SimOptions>) => void
}

// Контроллер вне реактивного состояния: сам симулятор и таймер цикла.
let simulator: Simulator | null = null
let timer: ReturnType<typeof setInterval> | null = null

export const useSimulationStore = create<SimState>((set, get) => {
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const publish = (traversed: string[]) => {
    if (!simulator) return
    set({
      snapshot: simulator.snapshot(),
      activeEdges: traversed,
      phase: simulator.finished ? "finished" : get().phase,
    })
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
    publish(traversed)
    if (finished) {
      stopTimer()
      set({ phase: "finished" })
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
      simulator = new Simulator(model, get().options)
      set({ phase: "running", snapshot: simulator.snapshot(), activeEdges: [] })
      timer = setInterval(runTick, TICK_MS)
    },

    pause: () => {
      stopTimer()
      if (get().phase === "running") set({ phase: "paused" })
    },

    resume: () => {
      if (!simulator || get().phase !== "paused") return
      set({ phase: "running" })
      timer = setInterval(runTick, TICK_MS)
    },

    stepOnce: () => {
      if (!simulator) return
      const res = simulator.step()
      set({
        snapshot: simulator.snapshot(),
        activeEdges: res.traversedEdges,
        phase: res.finished ? "finished" : "paused",
      })
    },

    reset: () => {
      stopTimer()
      simulator = null
      set({ phase: "idle", snapshot: null, activeEdges: [] })
    },

    setSpeed: (speed) => {
      set({ speed })
      // Перезапуск таймера не требуется — runTick читает скорость динамически.
    },

    setOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
  }
})

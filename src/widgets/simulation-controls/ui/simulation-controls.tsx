import { Pause, Play, RotateCcw, SkipForward } from "lucide-react"
import { useProcessStore } from "@/entities/process-model"
import { useSimulationStore } from "@/features/simulation"
import { fmt } from "@/shared/lib/format"
import { Button, NumberInput } from "@/shared/ui"

/** Логарифмическое отображение ползунка [0..1] → скорость [0.1x..10x]. */
const sliderToSpeed = (v: number) => Math.round(10 ** (2 * v - 1) * 10) / 10
const speedToSlider = (s: number) => (Math.log10(s) + 1) / 2

export function SimulationControls() {
  const phase = useSimulationStore((s) => s.phase)
  const speed = useSimulationStore((s) => s.speed)
  const options = useSimulationStore((s) => s.options)
  const snapshot = useSimulationStore((s) => s.snapshot)
  const start = useSimulationStore((s) => s.start)
  const pause = useSimulationStore((s) => s.pause)
  const resume = useSimulationStore((s) => s.resume)
  const step = useSimulationStore((s) => s.step)
  const reset = useSimulationStore((s) => s.reset)
  const setSpeed = useSimulationStore((s) => s.setSpeed)
  const setOptions = useSimulationStore((s) => s.setOptions)

  const getModel = useProcessStore((s) => s.getModel)
  const hasErrors = useProcessStore((s) => s.validation.hasErrors)

  const running = phase === "running"
  const stats = snapshot?.stats

  const onPlay = () => {
    if (phase === "idle" || phase === "finished") start(getModel())
    else if (phase === "paused") resume()
  }

  return (
    <div className="flex items-center gap-3 border-t border-border bg-card px-4 py-2">
      <div className="flex items-center gap-1">
        {running ? (
          <Button size="sm" variant="secondary" onClick={pause}>
            <Pause /> Пауза
          </Button>
        ) : (
          <Button size="sm" onClick={onPlay} disabled={hasErrors}>
            <Play /> {phase === "paused" ? "Продолжить" : "Запустить"}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => step(getModel())}
          disabled={hasErrors || running}
          title="Один шаг (одно событие модели)"
        >
          <SkipForward /> Шаг
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} disabled={phase === "idle"}>
          <RotateCcw /> Сброс
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">Скорость</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={speedToSlider(speed)}
          onChange={(e) => setSpeed(sliderToSpeed(Number(e.target.value)))}
          className="h-1.5 w-28 cursor-pointer accent-primary"
        />
        <span className="w-10 text-[11px] tabular-nums text-muted-foreground">{speed}×</span>
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        seed
        <NumberInput
          value={options.seed}
          onChange={(e) => setOptions({ seed: Number(e.target.value) })}
          disabled={phase !== "idle"}
          className="h-7 w-20"
        />
      </label>

      {hasErrors && (
        <span className="text-[11px] text-red-600 dark:text-red-400">
          Исправьте ошибки модели для запуска
        </span>
      )}

      <div className="ml-auto flex items-center gap-4 text-[11px] tabular-nums text-muted-foreground">
        <span>
          t = <b className="text-foreground">{fmt(stats?.time ?? 0, 1)}</b>
        </span>
        <span>
          заявок: <b className="text-foreground">{stats?.generated ?? 0}</b>
        </span>
        <span>
          завершено: <b className="text-foreground">{stats?.completed ?? 0}</b>
        </span>
        {phase === "finished" && <span className="text-emerald-500">прогон завершён</span>}
      </div>
    </div>
  )
}

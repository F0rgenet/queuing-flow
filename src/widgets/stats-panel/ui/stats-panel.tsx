import { Activity, AlertTriangle, CheckCircle2, Flame } from "lucide-react"
import { useProcessStore } from "@/entities/process-model"
import { useAnalyticsStore } from "@/features/analytics"
import { useSimulationStore } from "@/features/simulation"
import { fmt, fmtPercent } from "@/shared/lib/format"

export function StatsPanel() {
  const nodes = useProcessStore((s) => s.nodes)
  const analytics = useAnalyticsStore((s) => s.result)
  const phase = useSimulationStore((s) => s.phase)
  const snapshot = useSimulationStore((s) => s.snapshot)

  const label = (id: string | null) =>
    id ? nodes.find((n) => n.id === id)?.label ?? id : "—"

  const simMode = phase !== "idle" && snapshot
  const bottleneckId = simMode ? snapshot.stats.bottleneckId : analytics.bottleneckId

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-card/60 px-4 py-2 text-xs">
      <span className="flex items-center gap-1.5 font-medium">
        <Activity className="size-3.5" />
        {simMode ? "Режим: симуляция" : "Режим: аналитика"}
      </span>

      {!simMode && (
        <>
          {analytics.unavailable ? (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5" /> Расчёт недоступен (есть ошибки)
            </span>
          ) : analytics.systemStable ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Система стабильна
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-3.5" /> Система нестабильна (ρ ≥ 1)
            </span>
          )}
        </>
      )}

      {simMode && (
        <div className="flex flex-wrap items-center gap-x-4 tabular-nums text-muted-foreground">
          <span>
            создано: <b className="text-foreground">{snapshot.stats.generated}</b>
          </span>
          <span>
            завершено: <b className="text-foreground">{snapshot.stats.completed}</b>
          </span>
          <span>
            в системе: <b className="text-foreground">{snapshot.stats.inSystem}</b>
          </span>
          <span>
            потеряно: <b className="text-foreground">{snapshot.stats.dropped}</b>
          </span>
          <span>
            ср. время в системе:{" "}
            <b className="text-foreground">{fmt(snapshot.stats.avgSojourn)}</b>
          </span>
        </div>
      )}

      {bottleneckId && (
        <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
          <Flame className="size-3.5" /> Узкое место: {label(bottleneckId)}
          {!simMode && analytics.byNode[bottleneckId] && (
            <span className="text-muted-foreground">
              ({fmtPercent(analytics.byNode[bottleneckId].rho)})
            </span>
          )}
        </span>
      )}
    </div>
  )
}

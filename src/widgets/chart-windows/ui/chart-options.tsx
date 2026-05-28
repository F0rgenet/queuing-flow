import { RotateCcw } from "lucide-react"
import {
  metricsForNode,
  useProcessStore,
  type ChartMetric,
  type ChartWindow,
  type ProcessNode,
} from "@/entities/process-model"
import { useChartsStore } from "@/features/charts"
import { cn } from "@/shared/lib/cn"
import { CHART_COLORS } from "../lib/colors"

const METRIC_LABEL: Record<ChartMetric, string> = {
  cumulative: "Накоплено",
  rate: "Темп",
  queue: "Очередь",
  utilization: "Загрузка ρ",
}

const METRIC_HINT: Record<ChartMetric, string> = {
  cumulative: "Кумулятивный счётчик заявок за прогон",
  rate: "Производная: заявок в единицу модельного времени",
  queue: "Текущая длина очереди",
  utilization: "Доля занятых каналов",
}

interface Props {
  chart: ChartWindow
  node: ProcessNode
}

/** Панель опций окна графика: метрика, цвет, сброс истории. */
export function ChartOptions({ chart, node }: Props) {
  const setChartMetric = useProcessStore((s) => s.setChartMetric)
  const setChartColor = useProcessStore((s) => s.setChartColor)
  const clearNode = useChartsStore((s) => s.clearNode)
  const metrics = metricsForNode(node.type)

  return (
    <div
      className="nodrag space-y-2 border-b border-border bg-muted/30 px-2 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Метрика
        </div>
        <div className="flex flex-wrap gap-1">
          {metrics.map((m) => (
            <button
              key={m}
              type="button"
              title={METRIC_HINT[m]}
              onClick={() => setChartMetric(chart.id, m)}
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] transition-colors",
                chart.metric === m
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Цвет
        </div>
        <div className="flex flex-wrap gap-1">
          {CHART_COLORS.map((color, i) => (
            <button
              key={color}
              type="button"
              onClick={() => setChartColor(chart.id, i)}
              aria-label={`Цвет ${i + 1}`}
              className={cn(
                "size-4 rounded-full transition-transform hover:scale-110",
                chart.colorIndex === i
                  ? "ring-2 ring-foreground ring-offset-1 ring-offset-card"
                  : ""
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => clearNode(chart.nodeId)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
      >
        <RotateCcw className="size-3" />
        Сбросить историю узла
      </button>
    </div>
  )
}

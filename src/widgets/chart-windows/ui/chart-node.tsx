import { useState, type MouseEvent } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import type { Node, NodeProps } from "@xyflow/react"
import {
  useProcessStore,
  type ChartMetric,
  type ChartWindow,
  type ProcessNode,
} from "@/entities/process-model"
import { useChartsStore, type ChartSample } from "@/features/charts"
import { Button } from "@/shared/ui"
import { chartColor } from "../lib/colors"
import { ChartOptions } from "./chart-options"
import { LineChart } from "./line-chart"

const CHART_W = 320
const CHART_BODY_H = 164
const HEADER_H = 36

const KIND_LABEL: Record<ProcessNode["type"], string> = {
  source: "источник",
  operation: "операция",
  sink: "сток",
}

const METRIC_SUBTITLE: Record<ChartMetric, (kind: ProcessNode["type"]) => string> = {
  cumulative: (k) =>
    k === "source" ? "Создано заявок" : k === "operation" ? "Обработано заявок" : "Получено заявок",
  rate: (k) =>
    k === "source" ? "Темп создания" : k === "operation" ? "Темп обработки" : "Темп получения",
  queue: () => "Длина очереди",
  utilization: () => "Загрузка ρ",
}

const EMPTY_HISTORY: ChartSample[] = []

export type ChartFlowNode = Node<{ chart: ChartWindow }, "chart">

/**
 * Окно графика как узел React Flow. Клик по заголовку (без перетаскивания)
 * раскрывает/сворачивает панель опций: выбор метрики, цвет, сброс истории.
 * Drag работает штатно: React Flow не путает клик и перетаскивание.
 */
export function ChartNode({ data }: NodeProps<ChartFlowNode>) {
  const chart = data.chart
  const color = chartColor(chart.colorIndex)
  const node = useProcessStore((s) => s.nodes.find((n) => n.id === chart.nodeId))
  const history = useChartsStore((s) => s.history[chart.nodeId] ?? EMPTY_HISTORY)
  const closeChart = useProcessStore((s) => s.closeChart)
  const [optionsOpen, setOptionsOpen] = useState(false)

  if (!node) return null

  const subtitle = METRIC_SUBTITLE[chart.metric](node.type)

  const onToggleOptions = (e: MouseEvent) => {
    e.stopPropagation()
    setOptionsOpen((v) => !v)
  }

  return (
    <div
      className="overflow-hidden rounded-lg border-2 bg-card shadow-xl"
      style={{ borderColor: color, width: CHART_W }}
    >
      <div
        className="flex items-center gap-1.5 border-b border-border"
        style={{ backgroundColor: `${color}1f`, height: HEADER_H }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleOptions}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setOptionsOpen((v) => !v)
            }
          }}
          title={optionsOpen ? "Скрыть опции" : "Опции графика"}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 outline-none"
        >
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-semibold">
              {node.label}{" "}
              <span className="font-normal text-muted-foreground">
                · {KIND_LABEL[node.type]}
              </span>
            </span>
            <span className="truncate text-[10px] text-muted-foreground">{subtitle}</span>
          </div>
          {optionsOpen ? (
            <ChevronUp className="size-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3 text-muted-foreground" />
          )}
        </div>

        <Button
          size="icon-xs"
          variant="ghost"
          className="nodrag mr-1"
          aria-label="Закрыть график"
          onClick={(e) => {
            e.stopPropagation()
            closeChart(chart.id)
          }}
        >
          <X />
        </Button>
      </div>

      {optionsOpen && <ChartOptions chart={chart} node={node} />}

      <div style={{ height: CHART_BODY_H, width: CHART_W }}>
        <LineChart
          data={history}
          width={CHART_W}
          height={CHART_BODY_H}
          color={color}
          metric={chart.metric}
        />
      </div>
    </div>
  )
}

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { X } from "lucide-react"
import {
  useProcessStore,
  type ChartWindow,
  type ProcessNode,
} from "@/entities/process-model"
import { useChartsStore, type ChartSample } from "@/features/charts"
import { Button } from "@/shared/ui"
import { chartColor } from "../lib/colors"
import { LineChart } from "./line-chart"

const CHART_W = 320
const CHART_H = 200
const HEADER_H = 36

const NODE_KIND_TITLE: Record<ProcessNode["type"], string> = {
  source: "Создано заявок",
  operation: "Обработано заявок",
  sink: "Получено заявок",
}

/** Стабильная пустая ссылка, чтобы zustand-селектор не возвращал новый `[]`. */
const EMPTY_HISTORY: ChartSample[] = []

export type ChartFlowNode = Node<{ chart: ChartWindow }, "chart">

/**
 * Окно графика как полноправный узел React Flow: панорама/зум применяются
 * к нему так же, как к блокам процесса; перетаскивание — штатное.
 */
export function ChartNode({ data }: NodeProps<ChartFlowNode>) {
  const chart = data.chart
  const color = chartColor(chart.colorIndex)
  const node = useProcessStore((s) => s.nodes.find((n) => n.id === chart.nodeId))
  const history = useChartsStore((s) => s.history[chart.nodeId] ?? EMPTY_HISTORY)
  const closeChart = useProcessStore((s) => s.closeChart)

  if (!node) return null

  return (
    <div
      className="overflow-hidden rounded-lg border-2 bg-card shadow-xl"
      style={{ borderColor: color, width: CHART_W }}
    >
      {/* Невидимая ручка — точка крепления соединительной дуги. */}
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
        isConnectable={false}
      />

      <div
        className="flex items-center gap-1.5 border-b border-border px-2 py-1.5"
        style={{ backgroundColor: `${color}1f`, height: HEADER_H }}
      >
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-xs font-semibold">{node.label}</span>
          <span className="truncate text-[10px] text-muted-foreground">
            {NODE_KIND_TITLE[node.type]}
          </span>
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => closeChart(chart.id)}
          className="nodrag"
          aria-label="Закрыть график"
        >
          <X />
        </Button>
      </div>

      <div style={{ height: CHART_H - HEADER_H, width: CHART_W }}>
        <LineChart
          data={history}
          width={CHART_W}
          height={CHART_H - HEADER_H}
          color={color}
          unit="шт."
        />
      </div>
    </div>
  )
}

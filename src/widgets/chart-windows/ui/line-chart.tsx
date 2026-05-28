import { useMemo } from "react"
import type { ChartMetric } from "@/entities/process-model"
import type { ChartSample } from "@/features/charts"
import { fmt, fmtPercent } from "@/shared/lib/format"

interface Props {
  data: ChartSample[]
  width: number
  height: number
  metric: ChartMetric
  /** Цвет линии/заливки. По умолчанию — primary темы. */
  color?: string
}

const PAD_LEFT = 38
const PAD_RIGHT = 8
const PAD_TOP = 8
const PAD_BOTTOM = 22
/** Окно сглаживания для производной (точек) при метрике `rate`. */
const RATE_WINDOW = 5

/** Простой SVG-график выбранной метрики во времени. */
export function LineChart({ data, width, height, metric, color = "var(--primary)" }: Props) {
  const layout = useMemo(() => {
    if (data.length < 1) return null
    const xs = data.map((d) => d.t)
    const ys = computeMetricSeries(data, metric)

    const xMin = xs[0]
    const xMax = xs[xs.length - 1]
    const yMin = 0
    const yMax = niceMax(ys, metric)
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1

    const innerW = width - PAD_LEFT - PAD_RIGHT
    const innerH = height - PAD_TOP - PAD_BOTTOM

    const sx = (t: number) => PAD_LEFT + ((t - xMin) / xRange) * innerW
    const sy = (v: number) => PAD_TOP + innerH - ((v - yMin) / yRange) * innerH

    const path = data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.t)} ${sy(ys[i])}`)
      .join(" ")
    const area = `${path} L ${sx(xMax)} ${PAD_TOP + innerH} L ${sx(xMin)} ${PAD_TOP + innerH} Z`

    const yTicks = [0, yMax / 2, yMax]
    const xTicks = [xMin, (xMin + xMax) / 2, xMax]

    return { sx, sy, path, area, ys, xMin, xMax, yMax, innerW, innerH, yTicks, xTicks }
  }, [data, width, height, metric])

  if (!layout || data.length === 0) {
    return (
      <div className="flex size-full items-center justify-center text-center text-[11px] text-muted-foreground">
        Запустите симуляцию, чтобы увидеть данные
      </div>
    )
  }

  const lastValue = layout.ys[layout.ys.length - 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block size-full">
      {layout.yTicks.map((v, i) => {
        const y = layout.sy(v)
        return (
          <g key={`y-${i}`}>
            <line
              x1={PAD_LEFT}
              x2={width - PAD_RIGHT}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray={i === 0 ? undefined : "2 3"}
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 4}
              y={y + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: 9 }}
            >
              {formatTick(v, metric)}
            </text>
          </g>
        )
      })}

      {layout.xTicks.map((v, i) => {
        const x = layout.sx(v)
        return (
          <text
            key={`x-${i}`}
            x={x}
            y={height - 6}
            textAnchor={i === 0 ? "start" : i === layout.xTicks.length - 1 ? "end" : "middle"}
            className="fill-muted-foreground"
            style={{ fontSize: 9 }}
          >
            t={fmt(v, 1)}
          </text>
        )
      })}

      <path d={layout.area} fill={color} fillOpacity={0.12} />
      <path d={layout.path} fill="none" stroke={color} strokeWidth={1.5} />
      <circle
        cx={layout.sx(data[data.length - 1].t)}
        cy={layout.sy(lastValue)}
        r={2.5}
        fill={color}
      />

      <text
        x={width - PAD_RIGHT - 2}
        y={PAD_TOP + 9}
        textAnchor="end"
        className="fill-foreground font-semibold"
        style={{ fontSize: 10 }}
      >
        {formatValue(lastValue, metric)}
      </text>
    </svg>
  )
}

function computeMetricSeries(data: ChartSample[], metric: ChartMetric): number[] {
  switch (metric) {
    case "cumulative":
      return data.map((d) => d.cumulative)
    case "queue":
      return data.map((d) => d.queue)
    case "utilization":
      return data.map((d) => d.utilization)
    case "rate": {
      // Темп — наклон cumulative на окне RATE_WINDOW точек: устойчивее,
      // чем разница соседних точек, особенно при большой плотности событий.
      const result = new Array<number>(data.length)
      for (let i = 0; i < data.length; i++) {
        const j = Math.max(0, i - RATE_WINDOW)
        const dt = data[i].t - data[j].t
        result[i] = dt > 0 ? (data[i].cumulative - data[j].cumulative) / dt : 0
      }
      return result
    }
  }
}

function niceMax(ys: number[], metric: ChartMetric): number {
  const max = ys.reduce((m, v) => (v > m ? v : m), 0)
  if (metric === "utilization") return Math.max(1, max) // ρ всегда ≤ 1+; показываем шкалу до 100%
  return Math.max(1, max)
}

function formatTick(v: number, metric: ChartMetric): string {
  if (metric === "utilization") return `${Math.round(v * 100)}%`
  return fmt(v, 0)
}

function formatValue(v: number, metric: ChartMetric): string {
  switch (metric) {
    case "cumulative":
      return `${fmt(v, 0)} шт.`
    case "queue":
      return `${fmt(v, 0)}`
    case "utilization":
      return fmtPercent(v)
    case "rate":
      return `${fmt(v, 2)}/t`
  }
}

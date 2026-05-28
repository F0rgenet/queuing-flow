import { useMemo } from "react"
import type { ChartSample } from "@/features/charts"
import { fmt } from "@/shared/lib/format"

interface Props {
  data: ChartSample[]
  width: number
  height: number
  unit?: string
  /** Цвет линии/заливки. По умолчанию — primary темы. */
  color?: string
}

const PAD_LEFT = 38
const PAD_RIGHT = 8
const PAD_TOP = 8
const PAD_BOTTOM = 22

/** Простой SVG-график кумулятивной величины во времени. */
export function LineChart({ data, width, height, unit, color = "var(--primary)" }: Props) {
  const layout = useMemo(() => {
    if (data.length === 0) return null
    const xs = data.map((d) => d.t)
    const ys = data.map((d) => d.value)
    const xMin = xs[0]
    const xMax = xs[xs.length - 1]
    const yMin = 0
    const yMax = Math.max(1, ...ys)
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1

    const innerW = width - PAD_LEFT - PAD_RIGHT
    const innerH = height - PAD_TOP - PAD_BOTTOM

    const sx = (t: number) => PAD_LEFT + ((t - xMin) / xRange) * innerW
    const sy = (v: number) => PAD_TOP + innerH - ((v - yMin) / yRange) * innerH

    const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${sx(d.t)} ${sy(d.value)}`).join(" ")
    const area = `${path} L ${sx(xMax)} ${PAD_TOP + innerH} L ${sx(xMin)} ${PAD_TOP + innerH} Z`

    // Тики оси Y (0, mid, max).
    const yTicks = [0, yMax / 2, yMax]
    // Тики оси X (start, mid, end).
    const xTicks = [xMin, (xMin + xMax) / 2, xMax]

    return { sx, sy, path, area, xMin, xMax, yMax, innerW, innerH, yTicks, xTicks }
  }, [data, width, height])

  if (!layout || data.length === 0) {
    return (
      <div className="flex size-full items-center justify-center text-center text-[11px] text-muted-foreground">
        Запустите симуляцию, чтобы увидеть данные
      </div>
    )
  }

  const lastValue = data[data.length - 1].value

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block size-full"
    >
      {/* Горизонтальные линии сетки и тики оси Y */}
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
              {fmt(v, 0)}
            </text>
          </g>
        )
      })}

      {/* Тики оси X */}
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

      {/* Полупрозрачная заливка под линией */}
      <path d={layout.area} fill={color} fillOpacity={0.12} />

      {/* Линия */}
      <path d={layout.path} fill="none" stroke={color} strokeWidth={1.5} />

      {/* Подсветка последней точки */}
      <circle cx={layout.sx(data[data.length - 1].t)} cy={layout.sy(lastValue)} r={2.5} fill={color} />

      {/* Текущее значение в углу */}
      <text
        x={width - PAD_RIGHT - 2}
        y={PAD_TOP + 9}
        textAnchor="end"
        className="fill-foreground font-semibold"
        style={{ fontSize: 10 }}
      >
        {fmt(lastValue, 0)}
        {unit ? ` ${unit}` : ""}
      </text>
    </svg>
  )
}

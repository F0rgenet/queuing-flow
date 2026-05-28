import { ViewportPortal, useInternalNode, type InternalNode } from "@xyflow/react"
import { useProcessStore, type ChartWindow } from "@/entities/process-model"
import { chartColor } from "../lib/colors"

/**
 * Слой соединительных линий «окно ↔ блок» внутри viewport-портала React Flow.
 * Линии живут в flow-координатах: панорама и зум применяются автоматически.
 * `vector-effect: non-scaling-stroke` сохраняет толщину штриха независимо от
 * зума — линия не «жирнеет» и не «истончается» при масштабировании.
 *
 * Подход через ViewportPortal удобнее edge-системы: чарт-окно как узел может
 * быть и источником, и приёмником без обязательных Handle нужного типа, что
 * иначе ломало бы соединения для источников/стоков.
 */
export function ChartConnectorsLayer() {
  const charts = useProcessStore((s) => s.charts)
  if (charts.length === 0) return null

  return (
    <ViewportPortal>
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        {charts.map((c) => (
          <Connector key={c.id} chart={c} />
        ))}
      </svg>
    </ViewportPortal>
  )
}

function Connector({ chart }: { chart: ChartWindow }) {
  const chartNode = useInternalNode(chart.id)
  const targetNode = useInternalNode(chart.nodeId)
  if (!chartNode || !targetNode) return null

  const color = chartColor(chart.colorIndex)
  const s = rectFor(chartNode)
  const t = rectFor(targetNode)
  const sEdge = rectBoundaryToward(s, t.cx, t.cy)
  const tEdge = rectBoundaryToward(t, s.cx, s.cy)

  return (
    <g>
      {/* «гало» под основной линией для контраста */}
      <line
        x1={sEdge.x}
        y1={sEdge.y}
        x2={tEdge.x}
        y2={tEdge.y}
        stroke={color}
        strokeWidth={6}
        opacity={0.18}
        style={{ vectorEffect: "non-scaling-stroke" }}
      />
      <line
        x1={sEdge.x}
        y1={sEdge.y}
        x2={tEdge.x}
        y2={tEdge.y}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={0.95}
        style={{ vectorEffect: "non-scaling-stroke" }}
      />
      <circle
        cx={sEdge.x}
        cy={sEdge.y}
        r={4}
        fill={color}
        style={{ vectorEffect: "non-scaling-stroke" }}
      />
      <circle
        cx={tEdge.x}
        cy={tEdge.y}
        r={5}
        fill={color}
        stroke="var(--background)"
        strokeWidth={1.5}
        style={{ vectorEffect: "non-scaling-stroke" }}
      />
    </g>
  )
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

function rectFor(node: InternalNode): Rect {
  const pos = node.internals.positionAbsolute ?? node.position
  const w = node.measured.width ?? 0
  const h = node.measured.height ?? 0
  return { x: pos.x, y: pos.y, w, h, cx: pos.x + w / 2, cy: pos.y + h / 2 }
}

/** Точка пересечения прямоугольника с лучом из его центра в (ox, oy). */
function rectBoundaryToward(r: Rect, ox: number, oy: number): { x: number; y: number } {
  const dx = ox - r.cx
  const dy = oy - r.cy
  if (dx === 0 && dy === 0) return { x: r.cx, y: r.cy }
  const tx = dx !== 0 ? r.w / 2 / Math.abs(dx) : Infinity
  const ty = dy !== 0 ? r.h / 2 / Math.abs(dy) : Infinity
  const t = Math.min(tx, ty)
  return { x: r.cx + t * dx, y: r.cy + t * dy }
}

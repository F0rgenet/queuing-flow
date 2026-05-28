import {
  BaseEdge,
  getStraightPath,
  useInternalNode,
  type Edge,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react"
import { chartColor } from "../lib/colors"

interface Data extends Record<string, unknown> {
  colorIndex: number
}

export type ChartConnectorEdgeType = Edge<Data, "chart-connector">

/**
 * Соединение «окно-график → целевой блок». Floating-edge: ничего не знает про
 * хэндлы, концы линии — точки пересечения отрезка центр-центр с прямоугольниками
 * узлов (используются measured-размеры из React Flow, поэтому ничего не плывёт
 * при панораме/зуме). Цвет совпадает с цветом окна (из `data.colorIndex`).
 */
export function ChartConnectorEdge({ source, target, data }: EdgeProps<ChartConnectorEdgeType>) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  if (!sourceNode || !targetNode) return null

  const color = chartColor(data?.colorIndex ?? 0)
  const s = nodeRect(sourceNode)
  const t = nodeRect(targetNode)
  const sEdge = rectBoundaryToward(s, t.cx, t.cy)
  const tEdge = rectBoundaryToward(t, s.cx, s.cy)

  const [path] = getStraightPath({
    sourceX: sEdge.x,
    sourceY: sEdge.y,
    targetX: tEdge.x,
    targetY: tEdge.y,
  })

  return (
    <>
      <BaseEdge
        path={path}
        style={{
          stroke: color,
          strokeWidth: 1.5,
          strokeDasharray: "5 4",
          opacity: 0.9,
        }}
      />
      <circle cx={sEdge.x} cy={sEdge.y} r={3} fill={color} />
      <circle cx={tEdge.x} cy={tEdge.y} r={4} fill={color} />
    </>
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

function nodeRect(node: InternalNode): Rect {
  const pos = node.internals.positionAbsolute ?? node.position
  const w = node.measured.width ?? 0
  const h = node.measured.height ?? 0
  return {
    x: pos.x,
    y: pos.y,
    w,
    h,
    cx: pos.x + w / 2,
    cy: pos.y + h / 2,
  }
}

/** Точка на границе прямоугольника по лучу от его центра к (ox, oy). */
function rectBoundaryToward(r: Rect, ox: number, oy: number): { x: number; y: number } {
  const dx = ox - r.cx
  const dy = oy - r.cy
  if (dx === 0 && dy === 0) return { x: r.cx, y: r.cy }
  const halfW = r.w / 2
  const halfH = r.h / 2
  // Параметрически: точка = центр + t*(dx,dy); ищем минимальный t > 0, при котором
  // достигнута одна из границ |t*dx| = halfW или |t*dy| = halfH.
  const tx = dx !== 0 ? halfW / Math.abs(dx) : Infinity
  const ty = dy !== 0 ? halfH / Math.abs(dy) : Infinity
  const t = Math.min(tx, ty)
  return { x: r.cx + t * dx, y: r.cy + t * dy }
}

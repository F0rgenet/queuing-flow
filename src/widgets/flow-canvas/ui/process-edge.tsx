import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react"
import { useProcessStore, type FlowEdge } from "@/entities/process-model"
import { useSimulationStore } from "@/features/simulation"
import { cn } from "@/shared/lib/cn"
import { fmtPercent } from "@/shared/lib/format"

export function ProcessEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<FlowEdge>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const selectEdge = useProcessStore((s) => s.selectEdge)
  const active = useSimulationStore((s) => s.activeEdges.includes(id))
  const edge = data?.processEdge
  const isCondition = edge?.type === "condition"
  const prob = edge?.parameters?.probability
  const maxLoops = edge?.parameters?.max_loops

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          strokeWidth: selected ? 2.5 : 1.5,
          stroke: selected
            ? "var(--primary)"
            : isCondition
              ? "var(--muted-foreground)"
              : "var(--foreground)",
          strokeDasharray: isCondition ? "5 4" : undefined,
        }}
      />

      {/* Анимация движения заявок — кружочки, перемещающиеся по связи (ТЗ SIM-5). */}
      {active && (
        <>
          <circle r={4} fill="var(--primary)">
            <animateMotion dur="0.9s" repeatCount="indefinite" path={path} />
          </circle>
          <circle r={4} fill="var(--primary)" opacity={0.6}>
            <animateMotion dur="0.9s" begin="0.45s" repeatCount="indefinite" path={path} />
          </circle>
        </>
      )}

      {isCondition && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium tabular-nums shadow-sm",
              selected && "border-primary text-primary"
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onClick={() => selectEdge(id)}
          >
            p={fmtPercent(prob ?? 0)}
            {maxLoops != null && <span className="text-muted-foreground"> ·↺{maxLoops}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

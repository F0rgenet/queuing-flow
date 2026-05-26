import type { ReactNode } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import {
  isOperation,
  isSource,
  useProcessStore,
  type FlowNode,
} from "@/entities/process-model"
import { STATUS_STYLE } from "@/shared/config/status"
import { cn } from "@/shared/lib/cn"
import { fmt, fmtPercent } from "@/shared/lib/format"
import { useNodeMetrics } from "../lib/use-node-metrics"

const HANDLE = "!h-2.5 !w-2.5 !border-2 !border-background !bg-foreground/60"

function Selected({ id, children }: { id: string; children: ReactNode }) {
  const selected = useProcessStore((s) => s.selectedNodeId === id)
  return (
    <div
      className={cn(
        "rounded-xl ring-2 ring-transparent transition-all",
        selected && "ring-primary"
      )}
    >
      {children}
    </div>
  )
}

/** Tooltip уровня 2 (ТЗ §9.2) — показывается при наведении. */
function Tooltip({ rows }: { rows: [string, string][] }) {
  return (
    <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg group-hover:block">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-medium tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  )
}

export function OperationNode({ id, data }: NodeProps<FlowNode>) {
  const node = data.processNode
  const metrics = useNodeMetrics(id)
  const style = STATUS_STYLE[metrics?.status ?? "ok"]
  const c = isOperation(node) ? node.parameters.channels : 1
  const mu = isOperation(node) ? node.parameters.service_rate : 0

  return (
    <Selected id={id}>
      <div className="group relative w-44 rounded-xl border border-border bg-card p-3 shadow-sm">
        <Handle type="target" position={Position.Left} className={HANDLE} />
        <Handle type="source" position={Position.Right} className={HANDLE} />

        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{node.label}</span>
          <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
        </div>

        {/* Уровень 1: загрузка (progress bar) + очередь */}
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", style.bar)}
              style={{ width: `${Math.min(100, (metrics?.load ?? 0) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span className={style.text}>{fmtPercent(metrics?.load ?? 0)}</span>
            <span>очередь: {fmt(metrics?.queue ?? 0, 1)}</span>
          </div>
        </div>

        <Tooltip
          rows={[
            ["Каналов (c)", String(c)],
            ["μ (обслуж.)", fmt(mu)],
            ["ρ (загрузка)", fmtPercent(metrics?.load ?? 0)],
            ["W_q (ожидание)", fmt(metrics?.Wq ?? 0)],
            ["Пропускная", fmt(metrics?.throughput ?? 0)],
            ...(metrics?.source === "simulation"
              ? ([
                  ["Обработано", String(metrics.processed ?? 0)],
                  ["Потеряно", String(metrics.dropped ?? 0)],
                ] as [string, string][])
              : []),
          ]}
        />
      </div>
    </Selected>
  )
}

export function SourceNode({ id, data }: NodeProps<FlowNode>) {
  const node = data.processNode
  const rate = isSource(node) ? node.parameters.input_rate : 0
  return (
    <Selected id={id}>
      <div className="group relative w-40 rounded-xl border border-emerald-500/40 bg-card p-3 shadow-sm">
        <Handle type="source" position={Position.Right} className={HANDLE} />
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="truncate text-sm font-semibold">{node.label}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Источник · γ = {fmt(rate)}
        </div>
        <Tooltip rows={[["Тип", "Источник заявок"], ["γ (интенсивность)", fmt(rate)]]} />
      </div>
    </Selected>
  )
}

export function SinkNode({ id, data }: NodeProps<FlowNode>) {
  const node = data.processNode
  const metrics = useNodeMetrics(id)
  return (
    <Selected id={id}>
      <div className="group relative w-40 rounded-xl border border-sky-500/40 bg-card p-3 shadow-sm">
        <Handle type="target" position={Position.Left} className={HANDLE} />
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-sky-500" />
          <span className="truncate text-sm font-semibold">{node.label}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Сток · поток = {fmt(metrics?.throughput ?? 0)}
        </div>
        <Tooltip
          rows={[
            ["Тип", "Сток (выход)"],
            ["Входящий поток", fmt(metrics?.throughput ?? 0)],
          ]}
        />
      </div>
    </Selected>
  )
}

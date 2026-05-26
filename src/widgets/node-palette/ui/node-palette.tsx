import { CircleDot, Cpu, Flag } from "lucide-react"
import type { NodeType } from "@/entities/process-model"
import { DND_NODE_MIME } from "@/shared/config/dnd"

const ITEMS: { type: NodeType; label: string; desc: string; icon: typeof Cpu }[] = [
  { type: "source", label: "Источник", desc: "Генерирует заявки (γ)", icon: CircleDot },
  { type: "operation", label: "Операция", desc: "Обслуживание (μ, c)", icon: Cpu },
  { type: "sink", label: "Сток", desc: "Выход процесса", icon: Flag },
]

export function NodePalette() {
  return (
    <aside className="flex w-52 shrink-0 flex-col gap-2 border-r border-border bg-card/50 p-3">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Палитра
      </h2>
      <p className="px-1 text-[11px] text-muted-foreground/70">
        Перетащите блок на холст
      </p>
      {ITEMS.map(({ type, label, desc, icon: Icon }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DND_NODE_MIME, type)
            e.dataTransfer.effectAllowed = "move"
          }}
          className="flex cursor-grab items-center gap-3 rounded-lg border border-border bg-background p-2.5 transition-colors hover:border-primary/50 hover:bg-muted active:cursor-grabbing"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{label}</div>
            <div className="truncate text-[11px] text-muted-foreground">{desc}</div>
          </div>
        </div>
      ))}
    </aside>
  )
}

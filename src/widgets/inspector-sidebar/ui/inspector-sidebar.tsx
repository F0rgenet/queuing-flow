import { AlertTriangle, Info } from "lucide-react"
import { useProcessStore } from "@/entities/process-model"
import { Field, TextInput } from "@/shared/ui"
import { NodeInspector } from "./node-inspector"
import { EdgeInspector } from "./edge-inspector"

export function InspectorSidebar() {
  const nodes = useProcessStore((s) => s.nodes)
  const edges = useProcessStore((s) => s.edges)
  const selectedNodeId = useProcessStore((s) => s.selectedNodeId)
  const selectedEdgeId = useProcessStore((s) => s.selectedEdgeId)
  const validation = useProcessStore((s) => s.validation)
  const meta = useProcessStore((s) => s.meta)
  const setMeta = useProcessStore((s) => s.setMeta)
  const selectNode = useProcessStore((s) => s.selectNode)
  const selectEdge = useProcessStore((s) => s.selectEdge)

  const node = nodes.find((n) => n.id === selectedNodeId)
  const edge = edges.find((e) => e.id === selectedEdgeId)

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-card/50 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {node ? "Параметры блока" : edge ? "Параметры связи" : "Процесс"}
      </h2>

      {node && <NodeInspector node={node} />}
      {edge && <EdgeInspector edge={edge} />}

      {!node && !edge && (
        <div className="space-y-4">
          <Field label="Название процесса">
            <TextInput value={meta.title} onChange={(e) => setMeta({ title: e.target.value })} />
          </Field>
          <Field label="Описание">
            <TextInput
              value={meta.description}
              onChange={(e) => setMeta({ description: e.target.value })}
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Info className="size-3.5" />
              Проверка модели
            </div>
            {validation.issues.length === 0 ? (
              <p className="rounded-md bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                Замечаний нет. Модель корректна.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {validation.issues.map((issue, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        if (!issue.targetId) return
                        if (nodes.some((n) => n.id === issue.targetId)) selectNode(issue.targetId)
                        else selectEdge(issue.targetId)
                      }}
                      className={`flex w-full items-start gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] ${
                        issue.level === "error"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                      <span>
                        <span className="font-mono opacity-70">[{issue.code}]</span> {issue.message}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

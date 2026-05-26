import {
  outgoingProbabilitySum,
  useProcessStore,
  type EdgeType,
  type ProcessEdge,
} from "@/entities/process-model"
import { fmtPercent } from "@/shared/lib/format"
import { Button, Field, NumberInput, Range, Select } from "@/shared/ui"

export function EdgeInspector({ edge }: { edge: ProcessEdge }) {
  const updateEdge = useProcessStore((s) => s.updateEdge)
  const removeEdge = useProcessStore((s) => s.removeEdge)
  const nodes = useProcessStore((s) => s.nodes)
  const edges = useProcessStore((s) => s.edges)

  const sourceLabel = nodes.find((n) => n.id === edge.source)?.label ?? edge.source
  const targetLabel = nodes.find((n) => n.id === edge.target)?.label ?? edge.target
  const isCondition = edge.type === "condition"
  const prob = edge.parameters?.probability ?? 0
  const maxLoops = edge.parameters?.max_loops ?? null
  const sum = outgoingProbabilitySum(edge.source, edges)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
        <div className="font-medium">{sourceLabel}</div>
        <div className="my-0.5 text-muted-foreground">↓ переход</div>
        <div className="font-medium">{targetLabel}</div>
      </div>

      <Field label="Тип связи">
        <Select
          value={edge.type}
          onChange={(e) => updateEdge(edge.id, { type: e.target.value as EdgeType })}
        >
          <option value="direct">Прямая (direct)</option>
          <option value="condition">Условная / вероятностная (condition)</option>
        </Select>
      </Field>

      {isCondition && (
        <>
          <Field label={`Вероятность перехода: ${fmtPercent(prob)}`}>
            <Range
              min={0}
              max={1}
              step={0.05}
              value={prob}
              onChange={(e) =>
                updateEdge(edge.id, {
                  parameters: { ...edge.parameters, probability: Number(e.target.value) },
                })
              }
            />
          </Field>

          <Field label="Лимит проходов (max_loops)" hint="для циклов; пусто = без лимита">
            <NumberInput
              min={1}
              step={1}
              value={maxLoops ?? ""}
              onChange={(e) =>
                updateEdge(edge.id, {
                  parameters: {
                    ...edge.parameters,
                    max_loops: e.target.value === "" ? null : Number(e.target.value),
                  },
                })
              }
            />
          </Field>

          <div
            className={`rounded-md px-2 py-1.5 text-[11px] ${
              Math.abs(sum - 1) > 1e-6
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            Сумма исходящих вероятностей узла-источника: {fmtPercent(sum)}
            {Math.abs(sum - 1) > 1e-6 && " (должна быть 100%)"}
          </div>
        </>
      )}

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => removeEdge(edge.id)}
      >
        Удалить связь
      </Button>
    </div>
  )
}

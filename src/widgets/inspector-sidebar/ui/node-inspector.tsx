import {
  isOperation,
  isSource,
  useProcessStore,
  type Discipline,
  type Distribution,
  type ProcessNode,
} from "@/entities/process-model"
import { useAnalyticsStore } from "@/features/analytics"
import { STATUS_STYLE } from "@/shared/config/status"
import { fmt, fmtPercent } from "@/shared/lib/format"
import { Field, NumberInput, Select, TextInput } from "@/shared/ui"
import { Button } from "@/shared/ui"

const DISTRIBUTIONS: { value: Distribution; label: string }[] = [
  { value: "exponential", label: "Экспоненциальное" },
  { value: "deterministic", label: "Детерминированное" },
  { value: "uniform", label: "Равномерное" },
  { value: "normal", label: "Нормальное" },
]

export function NodeInspector({ node }: { node: ProcessNode }) {
  const updateLabel = useProcessStore((s) => s.updateNodeLabel)
  const updateParams = useProcessStore((s) => s.updateNodeParams)
  const removeNode = useProcessStore((s) => s.removeNode)
  const analytics = useAnalyticsStore((s) => s.result.byNode[node.id])

  return (
    <div className="space-y-4">
      <Field label="Название блока">
        <TextInput value={node.label} onChange={(e) => updateLabel(node.id, e.target.value)} />
      </Field>

      {isSource(node) && (
        <>
          <Field label="Интенсивность входа γ" hint="заявок в единицу времени">
            <NumberInput
              min={0}
              step={0.5}
              value={node.parameters.input_rate}
              onChange={(e) => updateParams(node.id, { input_rate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Закон интервалов">
            <Select
              value={node.parameters.distribution}
              onChange={(e) =>
                updateParams(node.id, { distribution: e.target.value as Distribution })
              }
            >
              {DISTRIBUTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Лимит заявок (симуляция)" hint="пусто = без лимита">
            <NumberInput
              min={1}
              value={node.parameters.limit ?? ""}
              onChange={(e) =>
                updateParams(node.id, {
                  limit: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
        </>
      )}

      {isOperation(node) && (
        <>
          <Field label="Интенсивность обслуживания μ" hint="на один канал">
            <NumberInput
              min={0}
              step={0.5}
              value={node.parameters.service_rate}
              onChange={(e) => updateParams(node.id, { service_rate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Число каналов c">
            <NumberInput
              min={1}
              step={1}
              value={node.parameters.channels}
              onChange={(e) =>
                updateParams(node.id, { channels: Math.max(1, Math.round(Number(e.target.value))) })
              }
            />
          </Field>
          <Field label="Закон обслуживания">
            <Select
              value={node.parameters.service_distribution}
              onChange={(e) =>
                updateParams(node.id, {
                  service_distribution: e.target.value as Distribution,
                })
              }
            >
              {DISTRIBUTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ёмкость очереди" hint="пусто = бесконечная">
            <NumberInput
              min={0}
              value={node.parameters.queue_capacity ?? ""}
              onChange={(e) =>
                updateParams(node.id, {
                  queue_capacity: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Дисциплина очереди">
            <Select
              value={node.parameters.discipline}
              onChange={(e) =>
                updateParams(node.id, { discipline: e.target.value as Discipline })
              }
            >
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
              <option value="priority">Приоритетная</option>
            </Select>
          </Field>
        </>
      )}

      {analytics && isOperation(node) && (
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">
            Аналитика (M/M/{node.parameters.channels})
          </div>
          <Metric label="λ (поток)" value={fmt(analytics.lambda)} />
          <Metric
            label="ρ (загрузка)"
            value={fmtPercent(analytics.rho)}
            className={STATUS_STYLE[analytics.status].text}
          />
          <Metric label="L_q (очередь)" value={fmt(analytics.Lq)} />
          <Metric label="W_q (ожидание)" value={fmt(analytics.Wq)} />
          <Metric label="W (в системе)" value={fmt(analytics.W)} />
          {!analytics.stable && (
            <p className="pt-1 text-[11px] text-red-600 dark:text-red-400">
              Система нестабильна: приток превышает пропускную способность.
            </p>
          )}
        </div>
      )}

      <Button variant="destructive" size="sm" className="w-full" onClick={() => removeNode(node.id)}>
        Удалить блок
      </Button>
    </div>
  )
}

function Metric({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${className ?? ""}`}>{value}</span>
    </div>
  )
}

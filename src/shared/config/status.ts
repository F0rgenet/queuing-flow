/**
 * Цветовая индикация загрузки узла (ТЗ §9.3).
 * Пороговые значения по коэффициенту загрузки ρ.
 */
export type LoadStatus = "ok" | "warning" | "critical" | "overloaded"

export const LOAD_THRESHOLDS = {
  warning: 0.6,
  critical: 0.85,
  overloaded: 1,
} as const

export function loadStatus(rho: number): LoadStatus {
  if (!Number.isFinite(rho) || rho >= LOAD_THRESHOLDS.overloaded) return "overloaded"
  if (rho >= LOAD_THRESHOLDS.critical) return "critical"
  if (rho >= LOAD_THRESHOLDS.warning) return "warning"
  return "ok"
}

/** Tailwind-токены для каждого статуса: текст, фон бара, рамка. */
export const STATUS_STYLE: Record<
  LoadStatus,
  { bar: string; text: string; ring: string; label: string; dot: string }
> = {
  ok: {
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/40",
    label: "Норма",
    dot: "bg-emerald-500",
  },
  warning: {
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/50",
    label: "Повышенная загрузка",
    dot: "bg-amber-500",
  },
  critical: {
    bar: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-500/60",
    label: "Риск узкого места",
    dot: "bg-red-500",
  },
  overloaded: {
    bar: "bg-red-700",
    text: "text-red-700 dark:text-red-400",
    ring: "ring-red-700/70",
    label: "Нестабильность (ρ ≥ 1)",
    dot: "bg-red-700 animate-pulse",
  },
}

/** Форматирование чисел для UI. */

export function fmt(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "∞"
  if (value === 0) return "0"
  return value.toLocaleString("ru-RU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

export function fmtPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "∞"
  return `${Math.round(ratio * 100)}%`
}

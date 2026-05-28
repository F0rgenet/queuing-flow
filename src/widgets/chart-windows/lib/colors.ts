/**
 * Палитра для окон графиков. Tailwind 600 — насыщенно, но не «вырвиглаз»;
 * хорошо читается и в светлой, и в тёмной теме.
 */
export const CHART_COLORS = [
  "#d97706", // amber-600
  "#0d9488", // teal-600
  "#7c3aed", // violet-600
  "#e11d48", // rose-600
  "#059669", // emerald-600
  "#2563eb", // blue-600
  "#ea580c", // orange-600
  "#c026d3", // fuchsia-600
] as const

export function chartColor(index: number): string {
  const n = CHART_COLORS.length
  return CHART_COLORS[((index % n) + n) % n]
}

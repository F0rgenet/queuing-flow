/** Одна точка временного ряда: модельное время t и кумулятивное значение метрики. */
export interface ChartSample {
  t: number
  value: number
}

/** Численные помощники для аналитического движка. */

export function factorial(n: number): number {
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

/**
 * Решение системы линейных уравнений A·x = b методом Гаусса
 * с частичным выбором ведущего элемента. Возвращает null, если
 * матрица вырождена.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length
  if (n === 0) return []
  // Рабочая копия расширенной матрицы.
  const m = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    // Поиск ведущего элемента.
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null
    ;[m[col], m[pivot]] = [m[pivot], m[col]]

    // Нормализация и исключение.
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = m[r][col] / m[col][col]
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c]
    }
  }

  return m.map((row, i) => row[n] / row[i])
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

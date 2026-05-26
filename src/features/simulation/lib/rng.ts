/**
 * Детерминированный ГСЧ (mulberry32) для воспроизводимых прогонов (ТЗ SIM-7).
 * Один seed → одна и та же последовательность.
 */
export function createRng(seed: number) {
  let state = seed >>> 0
  return function next(): number {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof createRng>

import type { Distribution } from "@/entities/process-model"
import type { Rng } from "./rng"

/**
 * Розыгрыш интервала времени по закону распределения (ТЗ §2.3).
 * `rate` — интенсивность (1/rate = среднее время интервала/обслуживания).
 */
export function sampleInterval(dist: Distribution, rate: number, rng: Rng): number {
  if (rate <= 0) return Infinity
  const mean = 1 / rate

  switch (dist) {
    case "deterministic":
      return mean

    case "uniform": {
      // Равномерно на [0.5·mean, 1.5·mean] → математическое ожидание = mean.
      const u = rng()
      return mean * (0.5 + u)
    }

    case "normal": {
      // Box–Muller, σ = 0.25·mean, отсечение неположительных значений.
      const u1 = Math.max(rng(), 1e-12)
      const u2 = rng()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      return Math.max(1e-6, mean + 0.25 * mean * z)
    }

    case "exponential":
    default: {
      const u = Math.max(rng(), 1e-12)
      return -Math.log(u) / rate
    }
  }
}

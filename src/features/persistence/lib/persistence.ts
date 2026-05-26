import { useEffect } from "react"
import { parse, serialize, useProcessStore, type ProcessModel } from "@/entities/process-model"

const STORAGE_KEY = "queuing-flow:model"
const SAVE_DEBOUNCE_MS = 1000

export function loadSavedModel(): ProcessModel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const result = parse(raw)
    return result.ok ? result.model : null
  } catch {
    return null
  }
}

export function saveModel(model: ProcessModel) {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(model))
  } catch {
    // переполнение/недоступность localStorage игнорируем
  }
}

export function exportModelFile(model: ProcessModel) {
  const blob = new Blob([serialize(model)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${model.meta.title || "process"}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Автосохранение модели в localStorage (ТЗ FR-19, NFR-3) с дебаунсом
 * и восстановление при старте (UC-8).
 */
export function usePersistence() {
  useEffect(() => {
    const saved = loadSavedModel()
    if (saved && saved.nodes.length > 0) {
      useProcessStore.getState().replaceModel(saved, false)
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    const unsub = useProcessStore.subscribe((state, prev) => {
      if (state.nodes === prev.nodes && state.edges === prev.edges && state.meta === prev.meta)
        return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => saveModel(state.getModel()), SAVE_DEBOUNCE_MS)
    })

    return () => {
      if (timer) clearTimeout(timer)
      unsub()
    }
  }, [])
}

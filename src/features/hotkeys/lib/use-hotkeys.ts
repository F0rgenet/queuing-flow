import { useEffect } from "react"
import { useProcessStore } from "@/entities/process-model"

/** Цель ввода, где Ctrl+Z должен управлять самим полем/редактором, а не графом. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], .monaco-editor"
    )
  )
}

/**
 * Горячие клавиши графа (ТЗ FR-8): Ctrl/Cmd+Z — отмена, Ctrl+Shift+Z / Ctrl+Y —
 * повтор. Внутри полей ввода и Monaco-редактора не перехватываются.
 */
export function useHotkeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key !== "z" && key !== "y") return
      if (isEditableTarget(e.target)) return

      e.preventDefault()
      const store = useProcessStore.getState()
      if (key === "y" || e.shiftKey) store.redo()
      else store.undo()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}

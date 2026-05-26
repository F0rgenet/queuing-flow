import { useEffect, useRef, useState } from "react"
import { parse, serialize, useProcessStore } from "@/entities/process-model"

const DEBOUNCE_MS = 300

/**
 * Двусторонняя синхронизация JSON-редактора и графа (ТЗ §8).
 * Правило фокуса: пока редактор в фокусе, текст не перезаписывается
 * изменениями графа; невалидный JSON не применяется к модели.
 */
export function useJsonSync() {
  const [text, setText] = useState(() => serialize(useProcessStore.getState().getModel()))
  const [error, setError] = useState<string | null>(null)
  const editingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Граф → текст (только когда редактор не редактируется пользователем).
  useEffect(() => {
    const unsub = useProcessStore.subscribe((state, prev) => {
      if (state.nodes === prev.nodes && state.edges === prev.edges && state.meta === prev.meta)
        return
      if (editingRef.current) return
      setText(serialize(state.getModel()))
      setError(null)
    })
    return unsub
  }, [])

  // Текст → граф (с дебаунсом и валидацией формы).
  const handleChange = (value: string | undefined) => {
    const next = value ?? ""
    setText(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const result = parse(next)
      if (result.ok) {
        setError(null)
        useProcessStore.getState().replaceModel(result.model)
      } else {
        setError(result.error)
      }
    }, DEBOUNCE_MS)
  }

  const handleFocus = () => {
    editingRef.current = true
  }

  const handleBlur = () => {
    editingRef.current = false
    // При выходе из редактора синхронизируем текст с актуальной моделью.
    if (!error) setText(serialize(useProcessStore.getState().getModel()))
  }

  const format = () => {
    const result = parse(text)
    if (result.ok) setText(serialize(result.model))
  }

  return { text, error, handleChange, handleFocus, handleBlur, format }
}

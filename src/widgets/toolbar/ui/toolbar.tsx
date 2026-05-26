import { useRef, type ChangeEvent } from "react"
import {
  Download,
  FilePlus2,
  Moon,
  Redo2,
  Sparkles,
  Sun,
  Undo2,
  Upload,
  Workflow,
} from "lucide-react"
import {
  emptyModel,
  parse,
  SAMPLE_MODEL,
  useProcessStore,
} from "@/entities/process-model"
import { useSimulationStore } from "@/features/simulation"
import { exportModelFile } from "@/features/persistence"
import { useTheme } from "@/shared/lib/theme"
import { Button } from "@/shared/ui"

export function Toolbar() {
  const meta = useProcessStore((s) => s.meta)
  const replaceModel = useProcessStore((s) => s.replaceModel)
  const undo = useProcessStore((s) => s.undo)
  const redo = useProcessStore((s) => s.redo)
  const canUndo = useProcessStore((s) => s.past.length > 0)
  const canRedo = useProcessStore((s) => s.future.length > 0)
  const getModel = useProcessStore((s) => s.getModel)
  const resetSim = useSimulationStore((s) => s.reset)
  const { theme, setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)

  const isDark =
    theme === "dark" ||
    (theme === "system" && document.documentElement.classList.contains("dark"))

  const loadModel = (model: typeof SAMPLE_MODEL) => {
    resetSim()
    replaceModel(model)
  }

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((c) => {
      const r = parse(c)
      if (r.ok) loadModel(r.model)
    })
    e.target.value = ""
  }

  return (
    <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-2">
        <Workflow className="size-5 text-primary" />
        <span className="font-semibold">QueuingFlow</span>
      </div>

      <span className="ml-2 max-w-48 truncate text-sm text-muted-foreground">{meta.title}</span>

      <div className="ml-4 flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => loadModel(emptyModel())}>
          <FilePlus2 /> Новый
        </Button>
        <Button size="sm" variant="ghost" onClick={() => loadModel(SAMPLE_MODEL)}>
          <Sparkles /> Пример
        </Button>
        <Button size="sm" variant="ghost" onClick={() => exportModelFile(getModel())}>
          <Download /> Экспорт
        </Button>
        <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
          <Upload /> Импорт
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImport}
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" onClick={undo} disabled={!canUndo} title="Отменить">
          <Undo2 />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={redo} disabled={!canRedo} title="Повторить">
          <Redo2 />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title="Тема"
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  )
}

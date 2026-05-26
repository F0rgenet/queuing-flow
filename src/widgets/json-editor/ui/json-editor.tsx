import { useRef, useState, type ChangeEvent } from "react"
import Editor from "@monaco-editor/react"
import { Check, ChevronDown, Copy, Download, Upload, X } from "lucide-react"
import { parse, useProcessStore } from "@/entities/process-model"
import { useJsonSync } from "@/features/json-sync"
import { exportModelFile } from "@/features/persistence"
import { useTheme } from "@/shared/lib/theme"
import { Button } from "@/shared/ui"

export function JsonEditor() {
  const { text, error, handleChange, handleFocus, handleBlur, format } = useJsonSync()
  const { theme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceModel = useProcessStore((s) => s.replaceModel)
  const getModel = useProcessStore((s) => s.getModel)

  const monacoTheme =
    theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"))
      ? "vs-dark"
      : "light"

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((content) => {
      const result = parse(content)
      if (result.ok) replaceModel(result.model)
    })
    e.target.value = ""
  }

  return (
    <div className="flex shrink-0 flex-col border-t border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <button
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed((c) => !c)}
        >
          <ChevronDown className={`size-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
          JSON-конфигурация
        </button>
        <div className="flex items-center gap-1">
          <Button size="xs" variant="ghost" onClick={format}>
            Формат
          </Button>
          <Button size="xs" variant="ghost" onClick={copy}>
            {copied ? <Check className="text-emerald-500" /> : <Copy />}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => exportModelFile(getModel())}>
            <Download />
          </Button>
          <Button size="xs" variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onUpload}
          />
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="h-52">
            <Editor
              language="json"
              value={text}
              theme={monacoTheme}
              onChange={handleChange}
              onMount={(editor) => {
                editor.onDidFocusEditorText(handleFocus)
                editor.onDidBlurEditorText(handleBlur)
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true,
              }}
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 border-t border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-600 dark:text-red-400">
              <X className="size-3.5 shrink-0" />
              {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}

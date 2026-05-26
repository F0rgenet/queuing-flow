import { useAnalyticsSync } from "@/features/analytics"
import { usePersistence } from "@/features/persistence"
import { useHotkeys } from "@/features/hotkeys"
import { Toolbar } from "@/widgets/toolbar"
import { NodePalette } from "@/widgets/node-palette"
import { FlowCanvas } from "@/widgets/flow-canvas"
import { InspectorSidebar } from "@/widgets/inspector-sidebar"
import { JsonEditor } from "@/widgets/json-editor"
import { SimulationControls } from "@/widgets/simulation-controls"
import { StatsPanel } from "@/widgets/stats-panel"

export function EditorPage() {
  // Фоновые процессы приложения: аналитика онлайн + автосохранение/восстановление.
  useAnalyticsSync()
  usePersistence()
  useHotkeys()

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      <Toolbar />

      <div className="flex min-h-0 flex-1">
        <NodePalette />

        <main className="flex min-w-0 flex-1 flex-col">
          <StatsPanel />
          <div className="min-h-0 flex-1">
            <FlowCanvas />
          </div>
        </main>

        <InspectorSidebar />
      </div>

      <JsonEditor />
      <SimulationControls />
    </div>
  )
}

import "@xyflow/react/dist/style.css"
import { ThemeProvider } from "@/shared/lib/theme"
import { ErrorBoundary } from "@/shared/ui"
import { EditorPage } from "@/pages/editor"

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="queuing-flow:theme">
      <ErrorBoundary>
        <EditorPage />
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App

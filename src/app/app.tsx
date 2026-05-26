import "@xyflow/react/dist/style.css"
import { ThemeProvider } from "@/shared/lib/theme"
import { EditorPage } from "@/pages/editor"

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="queuing-flow:theme">
      <EditorPage />
    </ThemeProvider>
  )
}

export default App

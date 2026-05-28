import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  fallback?: (error: Error, reset: () => void) => ReactNode
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Минимальный error-boundary: ловит ошибки рендера в поддереве и показывает
 * fallback вместо чёрного экрана. По умолчанию выводит сообщение и две кнопки —
 * «Повторить рендер» и «Очистить сохранённое состояние», чтобы пользователь
 * мог восстановиться после битого localStorage.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset)
    return <DefaultFallback error={this.state.error} reset={this.reset} />
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  const clearState = () => {
    try {
      localStorage.removeItem("queuing-flow:model")
    } catch {
      // ignore
    }
    location.reload()
  }
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
      <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
      <pre className="max-w-2xl overflow-auto rounded-md border border-border bg-muted/30 p-3 text-left text-xs">
        {error.message}
      </pre>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
        >
          Повторить рендер
        </button>
        <button
          onClick={clearState}
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/20"
        >
          Очистить сохранённое состояние и перезагрузить
        </button>
      </div>
    </div>
  )
}

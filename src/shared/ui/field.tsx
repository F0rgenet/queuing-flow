import * as React from "react"
import { cn } from "@/shared/lib/cn"

const inputClass =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:opacity-50"

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
    </label>
  )
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function NumberInput(props: React.ComponentProps<"input">) {
  return <input type="number" {...props} className={cn(inputClass, props.className)} />
}

export function Select({
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select {...props} className={cn(inputClass, "cursor-pointer", props.className)}>
      {children}
    </select>
  )
}

export function Range(props: React.ComponentProps<"input">) {
  return (
    <input
      type="range"
      {...props}
      className={cn("h-1.5 w-full cursor-pointer accent-primary", props.className)}
    />
  )
}

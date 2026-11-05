"use client"

import { useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { Check, Copy, Loader2 } from "lucide-react"
import type { ActionResult, ActionState } from "@/lib/actions/form"
import { cn } from "@/lib/utils"
import { buttonClass } from "./ui"

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode
  pendingText?: string
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md"
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, size, className)}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending && pendingText ? pendingText : children}
    </button>
  )
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null
  if (state.error) {
    return (
      <p role="alert" className="text-xs font-medium text-brand-red">
        {state.error}
      </p>
    )
  }
  if (state.message) {
    return (
      <p role="status" className="text-xs font-medium text-brand-green">
        {state.message}
      </p>
    )
  }
  return null
}

/** A button that runs a server action, with optional confirm, pending spinner and inline error. */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "secondary",
  size = "sm",
  className,
  disabled,
  title,
  onDone,
}: {
  action: () => Promise<ActionResult | void>
  children: React.ReactNode
  confirm?: string
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md"
  className?: string
  disabled?: boolean
  title?: string
  onDone?: (result: ActionResult) => void
}) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ error?: string; message?: string } | null>(null)

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        title={title}
        disabled={disabled || pending}
        className={buttonClass(variant, size, className)}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return
          setFeedback(null)
          startTransition(async () => {
            const result = await action()
            if (!result) return
            if ("error" in result) setFeedback({ error: result.error })
            else if (result.message) setFeedback({ message: result.message })
            onDone?.(result)
          })
        }}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {children}
      </button>
      {feedback?.error ? (
        <span role="alert" className="text-[11px] font-medium text-brand-red">
          {feedback.error}
        </span>
      ) : feedback?.message ? (
        <span role="status" className="text-[11px] font-medium text-brand-green">
          {feedback.message}
        </span>
      ) : null}
    </span>
  )
}

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={buttonClass("secondary", "sm", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          setCopied(false)
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  )
}

export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={cn(buttonClass("primary", "md"), className)}>
      Print / save as PDF
    </button>
  )
}

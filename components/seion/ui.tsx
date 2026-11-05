import { cn } from "@/lib/utils"

export type Tone = "neutral" | "blue" | "green" | "amber" | "red"

const toneClass: Record<Tone, string> = {
  neutral: "border-brand-border bg-gray-50 text-brand-text-secondary",
  blue: "border-blue-100 bg-blue-50 text-brand-blue",
  green: "border-green-100 bg-green-50 text-brand-green",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-100 bg-red-50 text-brand-red",
}

export function Badge({ tone = "neutral", children, title, className }: { tone?: Tone; children: React.ReactNode; title?: string; className?: string }) {
  return (
    <span
      title={title}
      className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold", toneClass[tone], className)}
    >
      {children}
    </span>
  )
}

type Variant = "primary" | "secondary" | "danger" | "ghost"
const variantClass: Record<Variant, string> = {
  primary: "bg-brand-blue text-white hover:bg-brand-blueHover border border-brand-blue",
  secondary: "border border-brand-border bg-white text-brand-text-primary hover:bg-gray-50",
  danger: "border border-red-200 bg-white text-brand-red hover:bg-red-50",
  ghost: "text-brand-blue hover:bg-blue-50",
}

export function buttonClass(variant: Variant = "secondary", size: "sm" | "md" = "md", extra?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
    variantClass[variant],
    extra,
  )
}

export const inputClass =
  "h-9 w-full min-w-0 rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-text-primary outline-none placeholder:text-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"

export const textareaClass =
  "w-full min-w-0 rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text-primary outline-none placeholder:text-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-brand-text-primary">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-brand-text-secondary">{hint}</p> : null}
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-brand-text-primary">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-brand-text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-brand-border bg-white shadow-bevel", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-brand-border px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-bold text-brand-text-primary">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-brand-text-secondary">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "green" | "red" | "amber" }) {
  return (
    <div className="min-w-0 rounded-xl border border-brand-border bg-white p-4 shadow-bevel">
      <p className="text-xs font-medium text-brand-text-secondary">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-2xl font-bold",
          tone === "green" ? "text-brand-green" : tone === "red" ? "text-brand-red" : tone === "amber" ? "text-amber-700" : "text-brand-text-primary",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-brand-text-secondary">{hint}</p> : null}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-border bg-white p-8 text-center">
      <p className="text-sm font-semibold text-brand-text-primary">{title}</p>
      {children ? <div className="mt-2 text-sm text-brand-text-secondary">{children}</div> : null}
    </div>
  )
}

export const tableClass = "w-full text-left text-sm"
export const thClass = "whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-text-secondary"
export const tdClass = "px-3 py-2 align-top"

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4">{children}</div>
}

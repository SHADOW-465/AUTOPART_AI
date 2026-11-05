import { revalidatePath } from "next/cache"

export type ActionState = { ok?: boolean; error?: string; message?: string } | null
export type ActionResult = { ok: true; message?: string } | { error: string }

export function text(fd: FormData, key: string): string {
  const value = fd.get(key)
  return typeof value === "string" ? value.trim() : ""
}

export function optionalText(fd: FormData, key: string): string | null {
  return text(fd, key) || null
}

/** Parses a number field; blank → null; invalid → throws a user-facing error. */
export function optionalNumber(fd: FormData, key: string, label: string, opts: { min?: number; max?: number; integer?: boolean } = {}): number | null {
  const raw = text(fd, key).replace(/,/g, "")
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new FormError(`${label} must be a number.`)
  if (opts.integer && !Number.isInteger(value)) throw new FormError(`${label} must be a whole number.`)
  if (opts.min != null && value < opts.min) throw new FormError(`${label} must be at least ${opts.min}.`)
  if (opts.max != null && value > opts.max) throw new FormError(`${label} must be at most ${opts.max}.`)
  return value
}

export function requiredNumber(fd: FormData, key: string, label: string, opts: { min?: number; max?: number; integer?: boolean } = {}): number {
  const value = optionalNumber(fd, key, label, opts)
  if (value == null) throw new FormError(`${label} is required.`)
  return value
}

export function checkbox(fd: FormData, key: string): boolean {
  const value = fd.get(key)
  return value === "on" || value === "true" || value === "1"
}

export class FormError extends Error {}

/** Maps thrown errors to a message safe to show the user. */
export function toError(error: unknown): { error: string } {
  if (error instanceof FormError) return { error: error.message }
  if (error instanceof Error && error.message && !/SQLITE|constraint|sqlite/i.test(error.message)) return { error: error.message }
  console.error(error)
  return { error: "Something went wrong saving that change. Please try again." }
}

export function refresh(): void {
  revalidatePath("/", "layout")
}

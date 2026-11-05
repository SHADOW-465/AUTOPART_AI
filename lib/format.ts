/** ₹ with Indian digit grouping. */
export function inr(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "—"
  const sign = value < 0 ? "−" : ""
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

/** ₹12.4 L, ₹1.2 Cr, ₹8,400 — for headline figures. */
export function inrShort(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  const sign = value < 0 ? "−" : ""
  const abs = Math.abs(value)
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`
}

export function num(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return value.toLocaleString("en-IN", { maximumFractionDigits: decimals })
}

export function pct(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(decimals)}%`
}

export function date(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" })
}

/** Text colour for a savings figure: green when positive, red when the alternative costs more, neutral at zero. */
export function savingsClass(value: number | null | undefined): string {
  if (value == null || value === 0 || !Number.isFinite(value)) return "text-brand-text-secondary"
  return value > 0 ? "text-brand-green" : "text-brand-red"
}

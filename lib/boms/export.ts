import { CUSTOMER_STATUS_LABELS, RECOMMENDATION_LABELS } from "@/lib/labels"
import type { LineView } from "./view"

export const EXPORT_HEADERS = [
  "Line",
  "Part number",
  "Part name",
  "Category",
  "Original spec",
  "Qty per vehicle",
  "Current unit cost (INR)",
  "Match",
  "Source standard",
  "Indian Standard",
  "Equivalence",
  "Validation",
  "Proposed supplier",
  "BIS licence",
  "IATF 16949",
  "Proposed unit cost (INR)",
  "Savings %",
  "Savings per vehicle (INR)",
  "Annual savings (INR)",
  "Lead time (days)",
  "Plant decision",
  "Customer approval",
  "Customer reference",
] as const

/** The alternative to report for a line: the accepted one, else the best-ranked non-rejected one. */
export function proposalFor(line: LineView) {
  return line.accepted ?? line.alternatives.find((a) => a.status !== "REJECTED") ?? null
}

/** Quotes a CSV cell and neutralises spreadsheet formula injection in text fields. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : ""
  if (typeof value === "boolean") return value ? "Yes" : "No"
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildBomCsv(lines: LineView[]): string {
  const rows = lines.map((line) => {
    const { item, fromSpec, toSpec, validation } = line
    const alt = proposalFor(line)
    return [
      item.line_number,
      item.part_number,
      item.part_name,
      item.category,
      item.original_spec,
      item.quantity,
      item.current_unit_cost,
      item.match_status === "MATCHED" ? "Matched" : "Needs review",
      fromSpec?.code,
      toSpec?.code,
      item.equivalence === "EQUIVALENT" ? "Equivalent" : item.equivalence === "NEAR" ? "Near" : null,
      validation ? RECOMMENDATION_LABELS[validation.recommendation] : null,
      alt ? (alt.supplier_name ?? "No quote yet") : null,
      alt?.supplier_id ? (alt.bis_licence_no ?? "Not recorded") : null,
      alt?.supplier_id ? alt.iatf_16949 : null,
      alt?.unit_cost,
      alt?.delta.pct,
      alt?.delta.perVehicle,
      alt?.delta.annual,
      alt?.lead_time_days,
      alt ? (alt.status === "ACCEPTED" ? "Accepted" : alt.status === "REJECTED" ? "Rejected" : "Suggested") : null,
      alt?.status === "ACCEPTED" ? CUSTOMER_STATUS_LABELS[alt.customer_status] : null,
      alt?.customer_ref,
    ]
      .map(csvCell)
      .join(",")
  })
  return [EXPORT_HEADERS.join(","), ...rows].join("\r\n") + "\r\n"
}

export function exportFilename(bomCode: string): string {
  const safe = bomCode.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "bom"
  return `${safe}-localization-proposal.csv`
}

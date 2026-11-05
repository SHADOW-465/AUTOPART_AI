import type { BomItem, PartAlternative, TechnicalValidation } from "@/lib/db/types"

export const EXPORT_HEADERS = [
  "Line",
  "Part number",
  "Part name",
  "Category",
  "Original spec",
  "Qty per vehicle",
  "Current unit cost (INR)",
  "Match",
  "Proposed IS code",
  "Proposed spec",
  "Proposed unit cost (INR)",
  "Savings %",
  "Lead time (days)",
  "AIS compliant",
  "Proposal status",
  "Validation",
] as const

/**
 * Picks the alternative to report for a line: the plant-accepted one if any,
 * otherwise the best-ranked suggestion that was not rejected.
 */
export function proposalFor(itemId: string, alternatives: PartAlternative[]): PartAlternative | null {
  const forItem = alternatives
    .filter((alt) => alt.bom_item_id === itemId && alt.status !== "REJECTED")
    .sort((a, b) => a.rank_order - b.rank_order)
  return forItem.find((alt) => alt.status === "ACCEPTED") ?? forItem[0] ?? null
}

function proposalStatus(alt: PartAlternative | null): string {
  if (!alt) return ""
  return alt.status === "ACCEPTED" ? "Accepted by plant - pending customer approval" : "Suggested"
}

/** Quotes a CSV cell and neutralises spreadsheet formula injection in text fields. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return ""
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ""
  if (typeof value === "boolean") return value ? "Yes" : "No"
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildBomCsv(
  items: BomItem[],
  alternatives: PartAlternative[],
  validationsByAlt: Record<string, TechnicalValidation | undefined> = {},
): string {
  const rows = [...items]
    .sort((a, b) => a.line_number - b.line_number)
    .map((item) => {
      const alt = proposalFor(item.id, alternatives)
      const validation = alt ? validationsByAlt[alt.id] : undefined
      return [
        item.line_number,
        item.part_number,
        item.part_name,
        item.category,
        item.original_spec,
        item.quantity_per_vehicle,
        item.current_unit_cost,
        item.match_status,
        alt?.indian_standard_code,
        alt?.alternative_spec,
        alt?.alternative_unit_cost,
        alt?.savings_percentage == null ? null : Number(alt.savings_percentage.toFixed(1)),
        alt?.lead_time_days,
        alt ? alt.is_ais_compliant : null,
        proposalStatus(alt),
        validation?.recommendation.replaceAll("_", " "),
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

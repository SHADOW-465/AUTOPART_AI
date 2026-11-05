import { mapHeader } from "./headers"
import type { BomColumn, NormalizedBomItem, RawBomRow } from "./types"

/** "1,000 nos" → 1000, "2.5 kg" → 2.5. Blank or unreadable → 1 (one per vehicle). */
export function parseQuantity(raw: string | undefined): number {
  const match = (raw ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/)
  if (!match) return 1
  const value = Number(match[0])
  return Number.isFinite(value) && value >= 0 ? value : 1
}

/** "₹1,250.50", "Rs. 3", "INR 12" → number. Blank, zero or unreadable → null (unknown cost). */
export function parseMoney(raw: string | undefined): number | null {
  const cleaned = (raw ?? "").replace(/,/g, "").replace(/(₹|rs\.?|inr)/gi, "").trim()
  const match = cleaned.match(/^-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) && value > 0 ? value : null
}

const STANDARD_REF =
  /\b(?:DIN\s+EN\s+ISO|DIN\s+EN|EN\s+ISO|DIN|ISO|IS|EN|JIS|SAE|ASTM)\s*-?\s*\d+(?:\s*\(?\s*part\s*\d+\s*\)?)?[^,;|]*/i

/** Finds the first standard reference ("DIN 933 M8x25 8.8") inside free text. */
export function findStandardReference(text: string): string | null {
  const match = text.match(STANDARD_REF)
  return match ? match[0].trim() : null
}

export type NormalizeResult = {
  items: NormalizedBomItem[]
  /** True when the header row had a part-name or spec column we recognise. */
  recognized: boolean
}

export function normalizeRows(rows: RawBomRow[]): NormalizeResult {
  const headers = rows.length > 0 ? Object.keys(rows[0].cells) : []
  const columns = new Map<BomColumn, string>()
  for (const header of headers) {
    const column = mapHeader(header)
    if (column && !columns.has(column)) columns.set(column, header)
  }
  const recognized = columns.has("part_name") || columns.has("original_spec")

  const get = (row: RawBomRow, column: BomColumn) => {
    const header = columns.get(column)
    return header ? (row.cells[header] ?? "").trim() : ""
  }

  const items: NormalizedBomItem[] = []
  for (const row of rows) {
    const partName = get(row, "part_name")
    const material = get(row, "material")
    let spec = get(row, "original_spec")
    if (!spec) spec = findStandardReference(partName) ?? findStandardReference(material) ?? material
    if (!partName && !spec) continue
    items.push({
      lineNumber: items.length + 1,
      partNumber: get(row, "part_number"),
      partName,
      originalSpec: spec,
      quantity: parseQuantity(get(row, "quantity")),
      unitCost: parseMoney(get(row, "unit_cost")),
      supplier: get(row, "supplier"),
      material,
      category: get(row, "category"),
    })
  }
  return { items, recognized }
}

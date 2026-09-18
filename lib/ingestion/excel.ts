import ExcelJS from "exceljs"
import { mapHeader } from "./headers"
import type { RawBomRow } from "./types"

export async function parseXlsx(buffer: ArrayBuffer): Promise<RawBomRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(buffer) as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const scanLimit = Math.min(20, sheet.rowCount)
  let headerRowNumber = -1
  let headers: string[] = []

  for (let r = 1; r <= scanLimit; r++) {
    const values = readRow(sheet.getRow(r))
    const mapped = values.filter((v) => mapHeader(v)).length
    if (mapped >= 2) {
      headerRowNumber = r
      headers = values
      break
    }
  }

  if (headerRowNumber < 0) return []

  const rows: RawBomRow[] = []
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const values = readRow(sheet.getRow(r), headers.length)
    const cells: Record<string, string> = {}
    let any = false
    headers.forEach((h, idx) => {
      const val = (values[idx] ?? "").trim()
      cells[h] = val
      if (val) any = true
    })
    if (!any) continue
    rows.push({ sourceLine: r, cells })
  }
  return rows
}

function readRow(row: ExcelJS.Row, columns?: number): string[] {
  const count = columns ?? Math.max(row.cellCount, 1)
  const out: string[] = []
  for (let c = 1; c <= count; c++) {
    out.push(cellText(row.getCell(c).value).trim())
  }
  return out
}

function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("")
    }
    if ("text" in value && typeof value.text === "string") return value.text
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue)
    if ("hyperlink" in value && "text" in value) return String((value as { text: string }).text)
  }
  return String(value)
}

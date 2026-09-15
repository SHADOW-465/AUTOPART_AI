import { readFileSync } from "node:fs"
import { mapHeader } from "./headers"
import type { BomColumn, RawBomRow } from "./types"

export function parseCsv(text: string): RawBomRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const delimiter = lines[0].includes("\t") ? "\t" : ","
  const headers = splitCsvLine(lines[0], delimiter)
  const mapped = headers.map(mapHeader)
  const rows: RawBomRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i], delimiter)
    const cells: Record<string, string> = {}
    headers.forEach((h, idx) => {
      cells[h] = (values[idx] ?? "").trim()
    })
    const named: Partial<Record<BomColumn, string>> = {}
    mapped.forEach((col, idx) => {
      if (col) named[col] = (values[idx] ?? "").trim()
    })
    if (!named.part_name && !named.original_spec) continue
    rows.push({ sourceLine: i + 1, cells })
  }
  return rows
}

export function parseCsvFile(path: string): RawBomRow[] {
  return parseCsv(readFileSync(path, "utf8"))
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

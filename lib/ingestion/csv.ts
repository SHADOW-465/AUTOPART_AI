import { readFileSync } from "node:fs"
import type { RawBomRow } from "./types"

/** Parses CSV/TSV text into rows keyed by header. Handles quoted fields, "" escapes and a UTF-8 BOM. */
export function parseCsv(text: string): RawBomRow[] {
  const lines = text
    .replace(/^﻿/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
  const headerIndex = lines.findIndex((l) => l.trim().length > 0)
  if (headerIndex < 0) return []
  const delimiter = lines[headerIndex].includes("\t") ? "\t" : lines[headerIndex].includes(";") && !lines[headerIndex].includes(",") ? ";" : ","
  const headers = splitCsvLine(lines[headerIndex], delimiter).map((h) => h.trim())
  const rows: RawBomRow[] = []
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = splitCsvLine(lines[i], delimiter)
    const cells: Record<string, string> = {}
    let any = false
    headers.forEach((h, idx) => {
      const value = (values[idx] ?? "").trim()
      cells[h] = value
      if (value) any = true
    })
    if (any) rows.push({ sourceLine: i + 1, cells })
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
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
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

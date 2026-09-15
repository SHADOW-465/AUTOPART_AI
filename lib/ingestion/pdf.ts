import { PDFParse } from "pdf-parse"
import { mapHeader } from "./headers"
import type { RawBomRow } from "./types"

export async function parsePdf(
  buffer: ArrayBuffer,
): Promise<{ ok: true; rows: RawBomRow[] } | { ok: false; code: "NO_TEXT_LAYER" }> {
  const parser = new PDFParse({ data: buffer })
  let text = ""
  try {
    const result = await parser.getText()
    text = result.text ?? ""
  } finally {
    await parser.destroy()
  }

  if (!text.trim()) return { ok: false, code: "NO_TEXT_LAYER" }

  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  let headerIdx = -1
  let headers: string[] = []
  let delimiter: string | RegExp = ","

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const delim: string | RegExp = line.includes(",") ? "," : /\s{2,}/
    const parts = splitLine(line, delim)
    const mapped = parts.filter((p) => mapHeader(p)).length
    if (mapped >= 2) {
      headerIdx = i
      headers = parts
      delimiter = delim
      break
    }
  }

  if (headerIdx < 0) return { ok: true, rows: [] }

  const rows: RawBomRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = splitLine(line, delimiter)
    const cells: Record<string, string> = {}
    let any = false
    headers.forEach((h, idx) => {
      const val = (values[idx] ?? "").trim()
      cells[h] = val
      if (val) any = true
    })
    if (!any) continue
    rows.push({ sourceLine: i + 1, cells })
  }

  return { ok: true, rows }
}

function splitLine(line: string, delimiter: string | RegExp): string[] {
  return line.split(delimiter).map((s) => s.trim())
}

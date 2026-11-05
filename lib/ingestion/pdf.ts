import { PDFParse } from "pdf-parse"
import { mapHeader } from "./headers"
import type { RawBomRow } from "./types"

/**
 * pdf.js normally loads its worker from a file next to its own module, which breaks once the server
 * code is bundled (and on serverless hosts, where that file isn't shipped). Registering the worker
 * module on globalThis makes pdf.js run it on the main thread; the static import is bundled like
 * any other dependency.
 */
/** pdf-parse inserts "-- 1 of 3 --" between pages. */
const PAGE_MARKER = /^--\s*\d+\s+of\s+\d+\s*--$/i

async function ensurePdfWorker(): Promise<void> {
  const g = globalThis as { pdfjsWorker?: unknown }
  if (g.pdfjsWorker) return
  g.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs")
}

export async function parsePdf(
  buffer: ArrayBuffer,
): Promise<{ ok: true; rows: RawBomRow[] } | { ok: false; code: "NO_TEXT_LAYER" }> {
  await ensurePdfWorker()
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
    if (!line || PAGE_MARKER.test(line)) continue
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

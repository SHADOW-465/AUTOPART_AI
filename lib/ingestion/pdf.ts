import { mapHeader } from "./headers"
import { installPdfGlobals } from "./pdf-env"
import type { RawBomRow } from "./types"

/** pdf-parse inserts "-- 1 of 3 --" between pages. */
const PAGE_MARKER = /^--\s*\d+\s+of\s+\d+\s*--$/i

type PdfParseModule = typeof import("pdf-parse")
let pdfParse: Promise<PdfParseModule> | null = null

/**
 * Loads pdf.js only when a PDF is actually parsed, so the rest of the app never depends on it.
 * Before loading: install the geometry globals pdf.js needs (see pdf-env.ts), and register its
 * worker on globalThis so it runs on the main thread instead of loading pdf.worker.mjs from disk,
 * a file that isn't present once the server code is bundled.
 */
function loadPdfParse(): Promise<PdfParseModule> {
  pdfParse ??= (async () => {
    installPdfGlobals()
    const g = globalThis as { pdfjsWorker?: unknown }
    g.pdfjsWorker ??= await import("pdfjs-dist/legacy/build/pdf.worker.mjs")
    return import("pdf-parse")
  })()
  pdfParse.catch(() => {
    pdfParse = null
  })
  return pdfParse
}

export async function parsePdf(
  buffer: ArrayBuffer,
): Promise<{ ok: true; rows: RawBomRow[] } | { ok: false; code: "NO_TEXT_LAYER" }> {
  const { PDFParse } = await loadPdfParse()
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

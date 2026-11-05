import { transaction, type Db } from "@/lib/db/client"
import { extractItemsFromRows } from "@/lib/groq/extract"
import { mapAiError } from "@/lib/groq/errors"
import { parseCsv } from "@/lib/ingestion/csv"
import { parseXlsx } from "@/lib/ingestion/excel"
import { normalizeRows } from "@/lib/ingestion/normalize"
import { parsePdf } from "@/lib/ingestion/pdf"
import type { NormalizedBomItem, RawBomRow } from "@/lib/ingestion/types"
import { logEvent } from "@/lib/repo/audit"
import { createBom, deleteItemsForBom, getBom, getBomSource, getItem, insertItem, listItems, setBomStatus } from "@/lib/repo/boms"
import { getSettings } from "@/lib/repo/settings"
import { loadCatalog } from "@/lib/repo/standards"
import { rematchItem } from "./rematch"

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const MESSAGES = {
  empty: "The file is empty.",
  tooLarge: "File must be 10 MB or smaller.",
  xls: "Old .xls files aren't supported. Save the sheet as .xlsx or CSV and upload again.",
  cad: "CAD/STEP files aren't supported. Export the BOM table as .xlsx or CSV.",
  unsupported: "Upload an .xlsx, .csv or text-based .pdf BOM.",
  pdfNoText: "This PDF has no text layer (it looks scanned). Export the BOM table to Excel or CSV.",
  noColumns:
    "Couldn't find Part / Description / Spec columns. Rename the header row to match the BOM template, or set GROQ_API_KEY to enable AI extraction.",
  noLines: "No BOM lines were found in the file.",
} as const

export type ImportDeps = {
  extractWithAi?: (rows: RawBomRow[]) => Promise<NormalizedBomItem[]>
  aiEnabled?: boolean
}

export type FileKind = "csv" | "xlsx" | "pdf"

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf(".")
  return dot < 0 ? "" : base.slice(dot + 1).toLowerCase()
}

/** Returns the parser to use, or a user-facing reason the file is rejected. */
export function classifyFile(filename: string, mime: string): { kind: FileKind } | { error: string } {
  const ext = extensionOf(filename)
  const m = mime.toLowerCase()
  if (ext === "xls") return { error: MESSAGES.xls }
  if (ext === "step" || ext === "stp" || ext === "igs" || ext === "iges") return { error: MESSAGES.cad }
  if (ext === "csv" || ext === "tsv" || ext === "txt" || m === "text/csv") return { kind: "csv" }
  if (ext === "xlsx" || m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return { kind: "xlsx" }
  if (ext === "pdf" || m === "application/pdf") return { kind: "pdf" }
  return { error: MESSAGES.unsupported }
}

function titleFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  return base.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled BOM"
}

class ImportError extends Error {}

async function parseRows(kind: FileKind, bytes: Uint8Array): Promise<RawBomRow[]> {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  if (kind === "csv") return parseCsv(new TextDecoder("utf-8").decode(bytes))
  if (kind === "xlsx") return parseXlsx(buffer)
  const result = await parsePdf(buffer)
  if (!result.ok) throw new ImportError(MESSAGES.pdfNoText)
  return result.rows
}

async function extractItems(rows: RawBomRow[], deps: ImportDeps): Promise<{ items: NormalizedBomItem[]; usedAi: boolean }> {
  const { items, recognized } = normalizeRows(rows)
  if (items.length > 0) return { items, usedAi: false }
  if (rows.length === 0) throw new ImportError(MESSAGES.noLines)
  const aiEnabled = deps.aiEnabled ?? Boolean(process.env.GROQ_API_KEY)
  if (recognized || !aiEnabled) throw new ImportError(recognized ? MESSAGES.noLines : MESSAGES.noColumns)
  try {
    const aiItems = await (deps.extractWithAi ?? extractItemsFromRows)(rows)
    if (aiItems.length === 0) throw new ImportError(MESSAGES.noLines)
    return { items: aiItems.map((item, index) => ({ ...item, lineNumber: index + 1 })), usedAi: true }
  } catch (error) {
    if (error instanceof ImportError) throw error
    throw new ImportError(`AI extraction failed: ${mapAiError(error)}`)
  }
}

/** Parses and matches the stored file for a BOM, replacing its lines. Marks FAILED with a reason on error. */
export async function processBomFile(db: Db, bomId: string, deps: ImportDeps = {}): Promise<{ ok: true } | { error: string }> {
  const source = getBomSource(db, bomId)
  if (!source) {
    setBomStatus(db, bomId, "FAILED", "The original file is missing. Upload it again.")
    return { error: "The original file is missing. Upload it again." }
  }
  setBomStatus(db, bomId, "PROCESSING")
  try {
    const classified = classifyFile(source.filename, source.mime)
    if ("error" in classified) throw new ImportError(classified.error)
    const rows = await parseRows(classified.kind, source.file)
    const { items, usedAi } = await extractItems(rows, deps)

    transaction(db, () => {
      deleteItemsForBom(db, bomId)
      const catalog = loadCatalog(db)
      for (const item of items) {
        const inserted = getItem(db, insertItem(db, bomId, item))!
        rematchItem(db, inserted, catalog)
      }
      const count = listItems(db, bomId).filter((i) => i.match_status === "MATCHED").length
      setBomStatus(db, bomId, "ANALYZED")
      logEvent(db, {
        bom_id: bomId,
        entity_type: "bom",
        entity_id: bomId,
        action: "bom.imported",
        summary: `Imported ${items.length} lines from ${source.filename}${usedAi ? " (AI extraction)" : ""}; ${count} matched to Indian Standards.`,
      })
    })
    return { ok: true }
  } catch (error) {
    const message = error instanceof ImportError ? error.message : "Couldn't read this file. Check it opens in Excel and try again."
    if (!(error instanceof ImportError)) console.error("BOM import failed", error)
    setBomStatus(db, bomId, "FAILED", message)
    logEvent(db, { bom_id: bomId, entity_type: "bom", entity_id: bomId, action: "bom.failed", summary: message })
    return { error: message }
  }
}

export type UploadInput = {
  filename: string
  mime: string
  bytes: Uint8Array
  title?: string | null
  customer_name?: string | null
  vehicle_platform?: string | null
  annual_volume?: number | null
}

/** Validates, stores and processes an uploaded BOM. Always returns the BOM id when one was created. */
export async function importBom(
  db: Db,
  input: UploadInput,
  deps: ImportDeps = {},
): Promise<{ bomId: string; error?: string } | { error: string }> {
  if (input.bytes.byteLength === 0) return { error: MESSAGES.empty }
  if (input.bytes.byteLength > MAX_UPLOAD_BYTES) return { error: MESSAGES.tooLarge }
  const classified = classifyFile(input.filename, input.mime)
  if ("error" in classified) return { error: classified.error }

  const bom = createBom(db, {
    title: input.title?.trim() || titleFromFilename(input.filename),
    filename: input.filename,
    mime: input.mime || null,
    file: input.bytes,
    annual_volume: input.annual_volume ?? getSettings(db).default_annual_volume,
    customer_name: input.customer_name,
    vehicle_platform: input.vehicle_platform,
  })
  const result = await processBomFile(db, bom.id, deps)
  return "error" in result ? { bomId: bom.id, error: result.error } : { bomId: bom.id }
}

export function bomExists(db: Db, id: string): boolean {
  return getBom(db, id) !== null
}

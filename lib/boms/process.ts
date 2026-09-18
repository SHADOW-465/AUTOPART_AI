import { mapAiActionError } from "@/lib/actions/ai-errors"
import { computeBomTotals } from "@/lib/boms/totals"
import type { BomStatus, MatchStatus } from "@/lib/db/types"
import { extractItemsFromRows as defaultExtract } from "@/lib/groq/extract"
import { parseCsv as defaultParseCsv } from "@/lib/ingestion/csv"
import { parseXlsx as defaultParseXlsx } from "@/lib/ingestion/excel"
import { parsePdf as defaultParsePdf } from "@/lib/ingestion/pdf"
import type { NormalizedBomItem, RawBomRow } from "@/lib/ingestion/types"
import { canonicalizeSpec } from "@/lib/matching/canonicalize"
import { matchEquivalent } from "@/lib/matching/lookup"
import type { StandardSpec, StandardsCatalog } from "@/lib/matching/types"
import { createServerClient } from "@/lib/supabase/server"

export const XLS_UNSUPPORTED_MESSAGE = "Export as .xlsx or CSV"
export const STEP_UNSUPPORTED_MESSAGE = "CAD/STEP files are not supported. Export as .xlsx or CSV."
export const PDF_NO_TEXT_MESSAGE = "This PDF has no text layer. Export tables to Excel."

export type CatalogPriceOffer = {
  supplierId: string
  unitCost: number
  leadTimeDays: number | null
}

export type InsertBomItemInput = {
  bomId: string
  tenantId: string
  lineNumber: number
  partNumber: string | null
  partName: string | null
  category: string | null
  originalSpec: string | null
  canonicalSpecKey: string | null
  materialGrade: string | null
  quantityPerVehicle: number
  currentUnitCost: number | null
  currentSupplierName: string | null
  matchStatus: MatchStatus
}

export type InsertPartAlternativeInput = {
  bomItemId: string
  tenantId: string
  supplierId: string
  standardSpecId: string
  rankOrder: number
  alternativeSpec: string
  indianStandardCode: string
  alternativeUnitCost: number
  savingsPercentage: number | null
  leadTimeDays: number | null
}

export type ProcessBomDb = {
  setBomStatus: (
    bomId: string,
    tenantId: string,
    status: BomStatus,
    extra?: {
      errorMessage?: string | null
      totalOriginalCost?: number | null
      totalOptimizedCost?: number | null
      totalSavingsPct?: number | null
    },
  ) => Promise<void>
  loadCatalog: () => Promise<StandardsCatalog>
  loadSupplierPrices: (standardSpecId: string) => Promise<CatalogPriceOffer[]>
  deleteBomItems: (bomId: string) => Promise<void>
  insertBomItem: (item: InsertBomItemInput) => Promise<{ id: string }>
  insertPartAlternative: (alt: InsertPartAlternativeInput) => Promise<void>
}

export type ProcessBomDeps = {
  db: ProcessBomDb
  parseCsv?: (text: string) => RawBomRow[]
  parseXlsx?: (buffer: ArrayBuffer) => Promise<RawBomRow[]>
  parsePdf?: (
    buffer: ArrayBuffer,
  ) => Promise<{ ok: true; rows: RawBomRow[] } | { ok: false; code: "NO_TEXT_LAYER" }>
  extractItemsFromRows?: (rows: RawBomRow[]) => Promise<NormalizedBomItem[]>
}

export async function processBom(
  bomId: string,
  tenantId: string,
  buffer: ArrayBuffer,
  mime: string,
  filename: string,
  deps?: ProcessBomDeps,
): Promise<void> {
  const resolved = deps ?? { db: await createSupabaseProcessDb() }
  const db = resolved.db
  const parseCsv = resolved.parseCsv ?? defaultParseCsv
  const parseXlsx = resolved.parseXlsx ?? defaultParseXlsx
  const parsePdf = resolved.parsePdf ?? defaultParsePdf
  const extract = resolved.extractItemsFromRows ?? defaultExtract

  try {
    await db.setBomStatus(bomId, tenantId, "EXTRACTING", { errorMessage: null })
    await db.deleteBomItems(bomId)

    const ext = extensionOf(filename)
    if (ext === "xls") {
      await fail(db, bomId, tenantId, XLS_UNSUPPORTED_MESSAGE)
      return
    }
    if (ext === "step" || ext === "stp") {
      await fail(db, bomId, tenantId, STEP_UNSUPPORTED_MESSAGE)
      return
    }

    const rows = await parseRows({
      buffer,
      mime,
      filename,
      ext,
      parseCsv,
      parseXlsx,
      parsePdf,
    })

    const items = await extract(rows)
    const catalog = await db.loadCatalog()
    const totalsItems: { quantity: number; currentUnitCost: number | null; acceptedAlternativeUnitCost: number | null }[] =
      []

    for (const item of items) {
      const canonical = canonicalizeSpec(item.originalSpec)
      const match = matchEquivalent(canonical, catalog)
      const matchStatus: MatchStatus = match.status === "MATCHED" ? "MATCHED" : "NEEDS_REVIEW"
      const inserted = await db.insertBomItem({
        bomId,
        tenantId,
        lineNumber: item.lineNumber,
        partNumber: emptyToNull(item.partNumber),
        partName: emptyToNull(item.partName),
        category: emptyToNull(item.category),
        originalSpec: emptyToNull(item.originalSpec),
        canonicalSpecKey: canonical || null,
        materialGrade: emptyToNull(item.material),
        quantityPerVehicle: item.quantity,
        currentUnitCost: item.unitCost,
        currentSupplierName: emptyToNull(item.supplier),
        matchStatus,
      })

      if (match.status === "MATCHED") {
        await insertAlternatives({
          db,
          tenantId,
          bomItemId: inserted.id,
          toSpec: match.toSpec,
          currentUnitCost: item.unitCost,
        })
      }

      totalsItems.push({
        quantity: item.quantity,
        currentUnitCost: item.unitCost,
        acceptedAlternativeUnitCost: null,
      })
    }

    const totals = computeBomTotals(totalsItems)
    await db.setBomStatus(bomId, tenantId, "ANALYZED", {
      errorMessage: null,
      totalOriginalCost: totals.totalOriginalCost,
      totalOptimizedCost: totals.totalOptimizedCost,
      totalSavingsPct: totals.totalSavingsPct,
    })
  } catch (err) {
    const mapped = mapAiActionError(err)
    const raw = err instanceof Error ? err.message : "BOM processing failed"
    const known =
      raw === XLS_UNSUPPORTED_MESSAGE ||
      raw === STEP_UNSUPPORTED_MESSAGE ||
      raw === PDF_NO_TEXT_MESSAGE ||
      raw === "Unsupported file type"
    const message = known ? raw : mapped
    try {
      await fail(db, bomId, tenantId, message)
    } catch (statusErr) {
      console.error("failed to mark BOM FAILED", statusErr)
    }
    if (known) throw err
    throw new Error(message)
  }
}

async function parseRows(input: {
  buffer: ArrayBuffer
  mime: string
  filename: string
  ext: string
  parseCsv: (text: string) => RawBomRow[]
  parseXlsx: (buffer: ArrayBuffer) => Promise<RawBomRow[]>
  parsePdf: ProcessBomDeps["parsePdf"] & {}
}): Promise<RawBomRow[]> {
  const kind = fileKind(input.ext, input.mime)
  if (kind === "csv") {
    return input.parseCsv(new TextDecoder("utf-8").decode(input.buffer))
  }
  if (kind === "xlsx") {
    return input.parseXlsx(input.buffer)
  }
  if (kind === "pdf") {
    const result = await input.parsePdf!(input.buffer)
    if (!result.ok) {
      throw new PdfNoTextError()
    }
    return result.rows
  }
  throw new Error("Unsupported file type")
}

class PdfNoTextError extends Error {
  constructor() {
    super(PDF_NO_TEXT_MESSAGE)
    this.name = "PdfNoTextError"
  }
}

async function fail(db: ProcessBomDb, bomId: string, tenantId: string, message: string) {
  await db.setBomStatus(bomId, tenantId, "FAILED", { errorMessage: message })
}

async function insertAlternatives(input: {
  db: ProcessBomDb
  tenantId: string
  bomItemId: string
  toSpec: StandardSpec
  currentUnitCost: number | null
}) {
  const offers = (await input.db.loadSupplierPrices(input.toSpec.id))
    .slice()
    .sort((a, b) => a.unitCost - b.unitCost)
    .slice(0, 3)

  let rank = 1
  for (const offer of offers) {
    const savings =
      input.currentUnitCost != null && input.currentUnitCost > 0
        ? (100 * (input.currentUnitCost - offer.unitCost)) / input.currentUnitCost
        : null
    await input.db.insertPartAlternative({
      bomItemId: input.bomItemId,
      tenantId: input.tenantId,
      supplierId: offer.supplierId,
      standardSpecId: input.toSpec.id,
      rankOrder: rank,
      alternativeSpec: input.toSpec.code,
      indianStandardCode: input.toSpec.code,
      alternativeUnitCost: offer.unitCost,
      savingsPercentage: savings,
      leadTimeDays: offer.leadTimeDays,
    })
    rank += 1
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf(".")
  if (dot < 0) return ""
  return base.slice(dot + 1).toLowerCase()
}

function fileKind(ext: string, mime: string): "csv" | "xlsx" | "pdf" | "unknown" {
  const m = mime.toLowerCase()
  if (ext === "csv" || m === "text/csv" || m === "text/plain") return "csv"
  if (
    ext === "xlsx" ||
    m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx"
  }
  if (ext === "pdf" || m === "application/pdf") return "pdf"
  return "unknown"
}

export async function createSupabaseProcessDb(): Promise<ProcessBomDb> {
  const supabase = await createServerClient()

  return {
    async setBomStatus(bomId, tenantId, status, extra) {
      const patch: Record<string, unknown> = { status }
      if (extra && "errorMessage" in extra) patch.error_message = extra.errorMessage ?? null
      if (extra?.totalOriginalCost != null) patch.total_original_cost = extra.totalOriginalCost
      if (extra?.totalOptimizedCost != null) patch.total_optimized_cost = extra.totalOptimizedCost
      if (extra?.totalSavingsPct != null) patch.total_savings_pct = extra.totalSavingsPct
      const { error } = await supabase.from("boms").update(patch).eq("id", bomId).eq("tenant_id", tenantId)
      if (error) throw new Error(error.message)
    },
    async loadCatalog() {
      const [{ data: specs, error: specErr }, { data: eqs, error: eqErr }] = await Promise.all([
        supabase.from("standard_specs").select("id, body, code, part_family, canonical_key"),
        supabase.from("standard_equivalents").select("from_spec_id, to_spec_id, equivalence"),
      ])
      if (specErr) throw new Error(specErr.message)
      if (eqErr) throw new Error(eqErr.message)
      return {
        specs: (specs ?? []).map((s) => ({
          id: s.id as string,
          body: s.body as StandardSpec["body"],
          code: s.code as string,
          partFamily: s.part_family as string,
          canonicalKey: s.canonical_key as string,
        })),
        equivalents: (eqs ?? []).map((e) => ({
          fromSpecId: e.from_spec_id as string,
          toSpecId: e.to_spec_id as string,
          equivalence: e.equivalence as "EQUIVALENT" | "NEAR" | "NOT_EQUIVALENT",
        })),
      }
    },
    async loadSupplierPrices(standardSpecId) {
      const { data, error } = await supabase
        .from("supplier_catalog_prices")
        .select("supplier_id, unit_cost, suppliers(average_lead_time_days)")
        .eq("standard_spec_id", standardSpecId)
      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => {
        const nested = row.suppliers as { average_lead_time_days?: number } | { average_lead_time_days?: number }[] | null
        const supplier = Array.isArray(nested) ? nested[0] : nested
        return {
          supplierId: row.supplier_id as string,
          unitCost: Number(row.unit_cost),
          leadTimeDays: supplier?.average_lead_time_days ?? null,
        }
      })
    },
    async deleteBomItems(bomId) {
      const { error } = await supabase.from("bom_items").delete().eq("bom_id", bomId)
      if (error) throw new Error(error.message)
    },
    async insertBomItem(item) {
      const { data, error } = await supabase
        .from("bom_items")
        .insert({
          bom_id: item.bomId,
          tenant_id: item.tenantId,
          line_number: item.lineNumber,
          part_number: item.partNumber,
          part_name: item.partName,
          category: item.category,
          original_spec: item.originalSpec,
          canonical_spec_key: item.canonicalSpecKey,
          material_grade: item.materialGrade,
          quantity_per_vehicle: item.quantityPerVehicle,
          current_unit_cost: item.currentUnitCost,
          current_supplier_name: item.currentSupplierName,
          match_status: item.matchStatus,
        })
        .select("id")
        .single()
      if (error || !data) throw new Error(error?.message ?? "Failed to insert BOM item")
      return { id: data.id as string }
    },
    async insertPartAlternative(alt) {
      const { error } = await supabase.from("part_alternatives").insert({
        bom_item_id: alt.bomItemId,
        tenant_id: alt.tenantId,
        supplier_id: alt.supplierId,
        standard_spec_id: alt.standardSpecId,
        rank_order: alt.rankOrder,
        alternative_spec: alt.alternativeSpec,
        indian_standard_code: alt.indianStandardCode,
        alternative_unit_cost: alt.alternativeUnitCost,
        savings_percentage: alt.savingsPercentage,
        lead_time_days: alt.leadTimeDays,
        status: "SUGGESTED",
      })
      if (error) throw new Error(error.message)
    },
  }
}

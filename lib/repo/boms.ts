import { newId, nowIso, type Db } from "@/lib/db/client"
import type { Bom, BomItem, BomStatus, MatchStatus } from "@/lib/db/types"
import type { NormalizedBomItem } from "@/lib/ingestion/types"
import { all, blankToNull, get, run } from "./sql"

const BOM_COLUMNS = `id, bom_code, title, customer_name, vehicle_platform, annual_volume, status, error_message,
  source_filename, source_mime, created_at, updated_at`

export function bomCode(): string {
  return `BOM-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`
}

export function createBom(
  db: Db,
  input: {
    title: string
    filename: string | null
    mime: string | null
    file: Uint8Array | null
    annual_volume: number
    customer_name?: string | null
    vehicle_platform?: string | null
  },
): Bom {
  const id = newId()
  const now = nowIso()
  run(
    db,
    `INSERT INTO boms (id, bom_code, title, customer_name, vehicle_platform, annual_volume, status, source_filename, source_mime, source_file, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PROCESSING', ?, ?, ?, ?, ?)`,
    id, bomCode(), input.title.trim() || "Untitled BOM", blankToNull(input.customer_name), blankToNull(input.vehicle_platform),
    Math.max(0, Math.round(input.annual_volume)), input.filename, input.mime, input.file, now, now,
  )
  return getBom(db, id)!
}

export function getBom(db: Db, id: string): Bom | null {
  return get<Bom>(db, `SELECT ${BOM_COLUMNS} FROM boms WHERE id = ?`, id)
}

export function getBomSource(db: Db, id: string): { file: Uint8Array; filename: string; mime: string } | null {
  const row = get<{ source_file: Uint8Array | null; source_filename: string | null; source_mime: string | null }>(
    db,
    "SELECT source_file, source_filename, source_mime FROM boms WHERE id = ?",
    id,
  )
  if (!row?.source_file) return null
  return { file: row.source_file, filename: row.source_filename ?? "upload", mime: row.source_mime ?? "" }
}

export function listBoms(db: Db): Bom[] {
  return all<Bom>(db, `SELECT ${BOM_COLUMNS} FROM boms ORDER BY created_at DESC`)
}

export function updateBomMeta(
  db: Db,
  id: string,
  input: { title: string; customer_name: string | null; vehicle_platform: string | null; annual_volume: number },
): void {
  run(
    db,
    "UPDATE boms SET title = ?, customer_name = ?, vehicle_platform = ?, annual_volume = ?, updated_at = ? WHERE id = ?",
    input.title.trim() || "Untitled BOM", blankToNull(input.customer_name), blankToNull(input.vehicle_platform),
    Math.max(0, Math.round(input.annual_volume)), nowIso(), id,
  )
}

export function setBomStatus(db: Db, id: string, status: BomStatus, errorMessage: string | null = null): void {
  run(db, "UPDATE boms SET status = ?, error_message = ?, updated_at = ? WHERE id = ?", status, errorMessage, nowIso(), id)
}

export function touchBom(db: Db, id: string): void {
  run(db, "UPDATE boms SET updated_at = ? WHERE id = ?", nowIso(), id)
}

export function deleteBom(db: Db, id: string): void {
  run(db, "DELETE FROM boms WHERE id = ?", id)
}

export function listItems(db: Db, bomId: string): BomItem[] {
  return all<BomItem>(db, "SELECT * FROM bom_items WHERE bom_id = ? ORDER BY line_number", bomId)
}

export function getItem(db: Db, id: string): BomItem | null {
  return get<BomItem>(db, "SELECT * FROM bom_items WHERE id = ?", id)
}

export function insertItem(db: Db, bomId: string, item: NormalizedBomItem): string {
  const id = newId()
  const now = nowIso()
  run(
    db,
    `INSERT INTO bom_items (id, bom_id, line_number, part_number, part_name, category, original_spec, material, quantity,
       current_unit_cost, current_supplier, match_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEEDS_REVIEW', ?, ?)`,
    id, bomId, item.lineNumber, blankToNull(item.partNumber), blankToNull(item.partName), blankToNull(item.category),
    blankToNull(item.originalSpec), blankToNull(item.material), item.quantity, item.unitCost, blankToNull(item.supplier), now, now,
  )
  return id
}

export type ItemEdit = {
  part_number: string | null
  part_name: string | null
  category: string | null
  original_spec: string | null
  quantity: number
  current_unit_cost: number | null
  current_supplier: string | null
}

export function updateItemFields(db: Db, id: string, edit: ItemEdit): void {
  run(
    db,
    `UPDATE bom_items SET part_number = ?, part_name = ?, category = ?, original_spec = ?, quantity = ?, current_unit_cost = ?,
       current_supplier = ?, updated_at = ? WHERE id = ?`,
    blankToNull(edit.part_number), blankToNull(edit.part_name), blankToNull(edit.category), blankToNull(edit.original_spec),
    edit.quantity, edit.current_unit_cost, blankToNull(edit.current_supplier), nowIso(), id,
  )
}

export function setItemMatch(
  db: Db,
  id: string,
  match: {
    canonical_spec_key: string | null
    match_status: MatchStatus
    from_spec_id: string | null
    to_spec_id: string | null
    equivalence: "EQUIVALENT" | "NEAR" | null
  },
): void {
  run(
    db,
    `UPDATE bom_items SET canonical_spec_key = ?, match_status = ?, from_spec_id = ?, to_spec_id = ?, equivalence = ?, updated_at = ?
     WHERE id = ?`,
    match.canonical_spec_key, match.match_status, match.from_spec_id, match.to_spec_id, match.equivalence, nowIso(), id,
  )
}

export function deleteItemsForBom(db: Db, bomId: string): void {
  run(db, "DELETE FROM bom_items WHERE bom_id = ?", bomId)
}

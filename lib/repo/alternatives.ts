import { newId, nowIso, transaction, type Db } from "@/lib/db/client"
import type { CustomerStatus, Origin, PartAlternative, PriceSource } from "@/lib/db/types"
import { all, blankToNull, get, placeholders, run } from "./sql"

export type AlternativeView = PartAlternative & {
  supplier_name: string | null
  supplier_email: string | null
  supplier_contact: string | null
  supplier_hub: string | null
  bis_licence_no: string | null
  iatf_16949: boolean
  iso_9001: boolean
  supplier_origin: Origin | null
  price_source: PriceSource | null
}

type ViewRow = Omit<AlternativeView, "iatf_16949" | "iso_9001"> & { iatf_16949: number | null; iso_9001: number | null }

const VIEW_SELECT = `
  SELECT a.*, s.name AS supplier_name, s.email AS supplier_email, s.contact_name AS supplier_contact,
    s.industrial_hub AS supplier_hub, s.bis_licence_no, s.iatf_16949, s.iso_9001, s.origin AS supplier_origin,
    p.source AS price_source
  FROM part_alternatives a
  LEFT JOIN suppliers s ON s.id = a.supplier_id
  LEFT JOIN supplier_prices p ON p.supplier_id = a.supplier_id AND p.standard_spec_id = a.standard_spec_id`

function toView(row: ViewRow): AlternativeView {
  return { ...row, iatf_16949: row.iatf_16949 === 1, iso_9001: row.iso_9001 === 1 }
}

export function listAlternativesForBom(db: Db, bomId: string): AlternativeView[] {
  return all<ViewRow>(
    db,
    `${VIEW_SELECT} JOIN bom_items i ON i.id = a.bom_item_id WHERE i.bom_id = ? ORDER BY i.line_number, a.rank_order`,
    bomId,
  ).map(toView)
}

export function listAlternativesForItem(db: Db, itemId: string): AlternativeView[] {
  return all<ViewRow>(db, `${VIEW_SELECT} WHERE a.bom_item_id = ? ORDER BY a.rank_order`, itemId).map(toView)
}

export function getAlternative(db: Db, id: string): PartAlternative | null {
  return get<PartAlternative>(db, "SELECT * FROM part_alternatives WHERE id = ?", id)
}

export function insertAlternative(
  db: Db,
  input: {
    bom_item_id: string
    standard_spec_id: string | null
    supplier_id: string | null
    indian_standard_code: string
    unit_cost: number | null
    lead_time_days: number | null
  },
): string {
  const id = newId()
  const now = nowIso()
  run(
    db,
    `INSERT INTO part_alternatives (id, bom_item_id, standard_spec_id, supplier_id, indian_standard_code, unit_cost, lead_time_days,
       rank_order, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 99, 'SUGGESTED', ?, ?)`,
    id, input.bom_item_id, input.standard_spec_id, input.supplier_id, input.indian_standard_code, input.unit_cost,
    input.lead_time_days, now, now,
  )
  return id
}

export function updateAlternativePrice(db: Db, id: string, unitCost: number | null, leadTimeDays: number | null): void {
  run(db, "UPDATE part_alternatives SET unit_cost = ?, lead_time_days = ?, updated_at = ? WHERE id = ?", unitCost, leadTimeDays, nowIso(), id)
}

export function deleteUndecidedForItem(db: Db, itemId: string): void {
  run(db, "DELETE FROM part_alternatives WHERE bom_item_id = ? AND status <> 'ACCEPTED'", itemId)
}

/** Priced alternatives cheapest first, then unpriced; accepted ones keep their place in that order. */
export function rerank(db: Db, itemId: string): void {
  const rows = all<{ id: string }>(
    db,
    `SELECT id FROM part_alternatives WHERE bom_item_id = ?
     ORDER BY unit_cost IS NULL, unit_cost, CASE status WHEN 'ACCEPTED' THEN 0 ELSE 1 END, created_at`,
    itemId,
  )
  rows.forEach((row, index) => run(db, "UPDATE part_alternatives SET rank_order = ? WHERE id = ?", index + 1, row.id))
}

export function acceptAlternative(db: Db, id: string): PartAlternative {
  return transaction(db, () => {
    const alt = getAlternative(db, id)
    if (!alt) throw new Error("Alternative not found.")
    const now = nowIso()
    run(
      db,
      `UPDATE part_alternatives SET status = 'REJECTED', customer_status = 'NOT_SUBMITTED', customer_ref = NULL, customer_notes = NULL,
         customer_updated_at = NULL, decided_at = ?, updated_at = ?
       WHERE bom_item_id = ? AND id <> ? AND status <> 'REJECTED'`,
      now, now, alt.bom_item_id, id,
    )
    run(
      db,
      "UPDATE part_alternatives SET status = 'ACCEPTED', decided_at = ?, updated_at = ? WHERE id = ?",
      now, now, id,
    )
    return getAlternative(db, id)!
  })
}

export function rejectAlternative(db: Db, id: string): PartAlternative {
  const now = nowIso()
  const { changes } = run(
    db,
    `UPDATE part_alternatives SET status = 'REJECTED', customer_status = 'NOT_SUBMITTED', customer_ref = NULL, customer_notes = NULL,
       customer_updated_at = NULL, decided_at = ?, updated_at = ? WHERE id = ?`,
    now, now, id,
  )
  if (changes === 0) throw new Error("Alternative not found.")
  return getAlternative(db, id)!
}

export function resetAlternative(db: Db, id: string): PartAlternative {
  const { changes } = run(
    db,
    `UPDATE part_alternatives SET status = 'SUGGESTED', customer_status = 'NOT_SUBMITTED', customer_ref = NULL, customer_notes = NULL,
       customer_updated_at = NULL, decided_at = NULL, updated_at = ? WHERE id = ?`,
    nowIso(), id,
  )
  if (changes === 0) throw new Error("Alternative not found.")
  return getAlternative(db, id)!
}

export function setCustomerStatus(
  db: Db,
  id: string,
  input: { customer_status: CustomerStatus; customer_ref: string | null; customer_notes: string | null },
): PartAlternative {
  const alt = getAlternative(db, id)
  if (!alt) throw new Error("Alternative not found.")
  if (alt.status !== "ACCEPTED") throw new Error("Accept this alternative before tracking customer approval.")
  const now = nowIso()
  run(
    db,
    `UPDATE part_alternatives SET customer_status = ?, customer_ref = ?, customer_notes = ?, customer_updated_at = ?, updated_at = ?
     WHERE id = ?`,
    input.customer_status, blankToNull(input.customer_ref), blankToNull(input.customer_notes),
    input.customer_status === "NOT_SUBMITTED" ? null : now, now, id,
  )
  return getAlternative(db, id)!
}

export type DecisionRow = {
  alternative_id: string
  bom_id: string
  bom_item_id: string
  quantity: number
  current_unit_cost: number | null
  unit_cost: number | null
  annual_volume: number
  category: string | null
  customer_status: CustomerStatus
  decided_at: string | null
  customer_updated_at: string | null
}

export function listAcceptedDecisions(db: Db, bomIds?: string[]): DecisionRow[] {
  const filter = bomIds && bomIds.length ? `AND b.id IN (${placeholders(bomIds.length)})` : ""
  return all<DecisionRow>(
    db,
    `SELECT a.id AS alternative_id, b.id AS bom_id, i.id AS bom_item_id, i.quantity, i.current_unit_cost, a.unit_cost,
       b.annual_volume, i.category, a.customer_status, a.decided_at, a.customer_updated_at
     FROM part_alternatives a
     JOIN bom_items i ON i.id = a.bom_item_id
     JOIN boms b ON b.id = i.bom_id
     WHERE a.status = 'ACCEPTED' ${filter}`,
    ...(bomIds ?? []),
  )
}

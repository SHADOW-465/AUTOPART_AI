import { newId, nowIso, type Db } from "@/lib/db/client"
import type { Rfq, RfqStatus } from "@/lib/db/types"
import { all, blankToNull, get, run } from "./sql"

export type RfqView = Rfq & { bom_code: string | null; bom_title: string | null; line_number: number | null }

const VIEW_SELECT = `
  SELECT r.*, b.bom_code, b.title AS bom_title, i.line_number
  FROM rfqs r
  LEFT JOIN boms b ON b.id = r.bom_id
  LEFT JOIN bom_items i ON i.id = r.bom_item_id`

export function createRfq(
  db: Db,
  input: Omit<Rfq, "id" | "status" | "sent_at" | "quoted_unit_cost" | "quoted_lead_time_days" | "quote_valid_until" | "quote_notes" | "created_at" | "updated_at">,
): Rfq {
  const id = newId()
  const now = nowIso()
  run(
    db,
    `INSERT INTO rfqs (id, rfq_code, bom_id, bom_item_id, supplier_id, standard_spec_id, spec_code, part_label, supplier_name,
       supplier_email, annual_quantity, target_unit_cost, subject, body, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)`,
    id, input.rfq_code, input.bom_id, input.bom_item_id, input.supplier_id, input.standard_spec_id, input.spec_code,
    input.part_label, input.supplier_name, input.supplier_email, input.annual_quantity, input.target_unit_cost,
    input.subject, input.body, now, now,
  )
  return getRfq(db, id)!
}

export function getRfq(db: Db, id: string): RfqView | null {
  return get<RfqView>(db, `${VIEW_SELECT} WHERE r.id = ?`, id)
}

export function listRfqs(db: Db, filter: { open?: boolean; supplierId?: string; bomId?: string } = {}): RfqView[] {
  const where: string[] = []
  const params: string[] = []
  if (filter.open) where.push("r.status IN ('DRAFT','SENT')")
  if (filter.supplierId) {
    where.push("r.supplier_id = ?")
    params.push(filter.supplierId)
  }
  if (filter.bomId) {
    where.push("r.bom_id = ?")
    params.push(filter.bomId)
  }
  return all<RfqView>(
    db,
    `${VIEW_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY CASE r.status WHEN 'DRAFT' THEN 0 WHEN 'SENT' THEN 1 WHEN 'QUOTED' THEN 2 ELSE 3 END, r.created_at DESC`,
    ...params,
  )
}

export function countOpenRfqs(db: Db): number {
  return get<{ n: number }>(db, "SELECT COUNT(*) AS n FROM rfqs WHERE status IN ('DRAFT','SENT')")?.n ?? 0
}

export function setRfqStatus(db: Db, id: string, status: RfqStatus): void {
  const now = nowIso()
  const { changes } = run(
    db,
    `UPDATE rfqs SET status = ?, sent_at = CASE WHEN ? = 'SENT' AND sent_at IS NULL THEN ? ELSE sent_at END, updated_at = ? WHERE id = ?`,
    status, status, now, now, id,
  )
  if (changes === 0) throw new Error("RFQ not found.")
}

export function saveQuote(
  db: Db,
  id: string,
  quote: { unit_cost: number; lead_time_days: number | null; valid_until: string | null; notes: string | null },
): void {
  const now = nowIso()
  run(
    db,
    `UPDATE rfqs SET status = 'QUOTED', quoted_unit_cost = ?, quoted_lead_time_days = ?, quote_valid_until = ?, quote_notes = ?,
       sent_at = COALESCE(sent_at, ?), updated_at = ? WHERE id = ?`,
    quote.unit_cost, quote.lead_time_days, blankToNull(quote.valid_until), blankToNull(quote.notes), now, now, id,
  )
}

export function newRfqId(): string {
  return newId()
}

import { newId, nowIso, type Db } from "@/lib/db/client"
import type { Origin, PriceSource, Supplier, SupplierPrice } from "@/lib/db/types"
import { all, blankToNull, get, run } from "./sql"

type SupplierRow = Omit<Supplier, "iatf_16949" | "iso_9001"> & { iatf_16949: number; iso_9001: number }

function toSupplier(row: SupplierRow): Supplier {
  return { ...row, iatf_16949: row.iatf_16949 === 1, iso_9001: row.iso_9001 === 1 }
}

export type SupplierListRow = Supplier & { price_count: number; open_rfqs: number }

export function listSuppliers(db: Db): SupplierListRow[] {
  return all<SupplierRow & { price_count: number; open_rfqs: number }>(
    db,
    `SELECT s.*,
       (SELECT COUNT(*) FROM supplier_prices p WHERE p.supplier_id = s.id) AS price_count,
       (SELECT COUNT(*) FROM rfqs r WHERE r.supplier_id = s.id AND r.status IN ('DRAFT','SENT')) AS open_rfqs
     FROM suppliers s ORDER BY s.origin DESC, s.name COLLATE NOCASE`,
  ).map((r) => ({ ...toSupplier(r), price_count: r.price_count, open_rfqs: r.open_rfqs }))
}

export function getSupplier(db: Db, id: string): Supplier | null {
  const row = get<SupplierRow>(db, "SELECT * FROM suppliers WHERE id = ?", id)
  return row ? toSupplier(row) : null
}

export type SupplierInput = {
  id?: string | null
  name: string
  industrial_hub?: string | null
  state?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  bis_licence_no?: string | null
  iatf_16949: boolean
  iso_9001: boolean
  rating?: number | null
  lead_time_days?: number | null
  notes?: string | null
}

export function saveSupplier(db: Db, input: SupplierInput): string {
  const name = input.name.trim()
  if (!name) throw new Error("Supplier name is required.")
  const clash = get<{ id: string }>(db, "SELECT id FROM suppliers WHERE name = ? COLLATE NOCASE", name)
  if (clash && clash.id !== input.id) throw new Error(`A supplier named "${name}" already exists.`)
  const now = nowIso()
  const values = [
    name,
    blankToNull(input.industrial_hub),
    blankToNull(input.state),
    blankToNull(input.contact_name),
    blankToNull(input.email),
    blankToNull(input.phone),
    blankToNull(input.bis_licence_no),
    input.iatf_16949,
    input.iso_9001,
    input.rating ?? null,
    input.lead_time_days ?? null,
    blankToNull(input.notes),
  ] as const
  if (input.id) {
    const { changes } = run(
      db,
      `UPDATE suppliers SET name = ?, industrial_hub = ?, state = ?, contact_name = ?, email = ?, phone = ?, bis_licence_no = ?,
         iatf_16949 = ?, iso_9001 = ?, rating = ?, lead_time_days = ?, notes = ?, updated_at = ? WHERE id = ?`,
      ...values, now, input.id,
    )
    if (changes === 0) throw new Error("Supplier not found.")
    return input.id
  }
  const id = newId()
  run(
    db,
    `INSERT INTO suppliers (name, industrial_hub, state, contact_name, email, phone, bis_licence_no, iatf_16949, iso_9001, rating,
       lead_time_days, notes, id, origin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLANT', ?, ?)`,
    ...values, id, now, now,
  )
  return id
}

export function deleteSupplier(db: Db, id: string): void {
  run(db, "DELETE FROM suppliers WHERE id = ?", id)
}

export type PriceView = SupplierPrice & { spec_code: string; part_family: string }

export function listPricesForSupplier(db: Db, supplierId: string): PriceView[] {
  return all<PriceView>(
    db,
    `SELECT p.*, s.code AS spec_code, s.part_family AS part_family
     FROM supplier_prices p JOIN standard_specs s ON s.id = p.standard_spec_id
     WHERE p.supplier_id = ? ORDER BY s.part_family, s.code`,
    supplierId,
  )
}

export type Offer = {
  supplier_id: string
  unit_cost: number
  lead_time_days: number | null
  source: PriceSource
}

/** Supplier prices for one spec, cheapest first. Lead time falls back to the supplier default. */
export function listOffersForSpec(db: Db, specId: string): Offer[] {
  return all<Offer>(
    db,
    `SELECT p.supplier_id, p.unit_cost, COALESCE(p.lead_time_days, s.lead_time_days) AS lead_time_days, p.source
     FROM supplier_prices p JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.standard_spec_id = ? AND (p.valid_until IS NULL OR p.valid_until >= date('now'))
     ORDER BY p.unit_cost ASC, s.rating DESC`,
    specId,
  )
}

export function getPrice(db: Db, supplierId: string, specId: string): Offer | null {
  return get<Offer>(
    db,
    `SELECT p.supplier_id, p.unit_cost, COALESCE(p.lead_time_days, s.lead_time_days) AS lead_time_days, p.source
     FROM supplier_prices p JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.supplier_id = ? AND p.standard_spec_id = ?`,
    supplierId, specId,
  )
}

export function upsertPrice(
  db: Db,
  input: {
    supplier_id: string
    standard_spec_id: string
    unit_cost: number
    lead_time_days?: number | null
    valid_until?: string | null
    source: PriceSource
  },
): void {
  if (!(input.unit_cost >= 0)) throw new Error("Unit cost must be zero or more.")
  run(
    db,
    `INSERT INTO supplier_prices (id, supplier_id, standard_spec_id, unit_cost, lead_time_days, valid_until, source, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(supplier_id, standard_spec_id) DO UPDATE SET
       unit_cost = excluded.unit_cost, lead_time_days = excluded.lead_time_days,
       valid_until = excluded.valid_until, source = excluded.source, updated_at = excluded.updated_at`,
    newId(), input.supplier_id, input.standard_spec_id, input.unit_cost, input.lead_time_days ?? null,
    blankToNull(input.valid_until), input.source, nowIso(),
  )
}

export function deletePrice(db: Db, id: string): void {
  run(db, "DELETE FROM supplier_prices WHERE id = ?", id)
}

export function supplierOrigin(db: Db, id: string): Origin | null {
  return get<{ origin: Origin }>(db, "SELECT origin FROM suppliers WHERE id = ?", id)?.origin ?? null
}

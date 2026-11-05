import { newId, nowIso, type Db } from "@/lib/db/client"
import type { Equivalence, MechanicalFields, StandardBody, StandardEquivalentRow, StandardSpec } from "@/lib/db/types"
import { canonicalizeSpec } from "@/lib/matching/canonicalize"
import type { StandardsCatalog } from "@/lib/matching/types"
import { all, blankToNull, get, run } from "./sql"

type SpecRow = Omit<StandardSpec, "mechanical"> & { mechanical: string }

function toSpec(row: SpecRow): StandardSpec {
  let mechanical: MechanicalFields = {}
  try {
    mechanical = JSON.parse(row.mechanical) as MechanicalFields
  } catch {
    mechanical = {}
  }
  return { ...row, mechanical }
}

export function listSpecs(db: Db, query = ""): StandardSpec[] {
  const q = `%${query.trim()}%`
  return all<SpecRow>(
    db,
    `SELECT * FROM standard_specs
     WHERE ? = '%%' OR code LIKE ? OR part_family LIKE ? OR notes LIKE ? OR body LIKE ?
     ORDER BY part_family, CASE body WHEN 'IS' THEN 1 ELSE 0 END, code`,
    q, q, q, q, q,
  ).map(toSpec)
}

export function getSpec(db: Db, id: string): StandardSpec | null {
  const row = get<SpecRow>(db, "SELECT * FROM standard_specs WHERE id = ?", id)
  return row ? toSpec(row) : null
}

/** The key the matcher compares against: the first segment of the canonical spec. */
export function canonicalKeyFor(code: string): string {
  return canonicalizeSpec(code).split("|")[0] ?? ""
}

export type NewSpecInput = {
  body: StandardBody
  code: string
  part_family: string
  mechanical: MechanicalFields
  notes?: string | null
  source_ref?: string | null
}

export function addSpec(db: Db, input: NewSpecInput): StandardSpec {
  const code = input.code.trim()
  const key = canonicalKeyFor(code)
  if (!code || !key) throw new Error("Enter a standard code, for example DIN 933 or IS 1364 Part 2.")
  const existing = get<{ code: string }>(db, "SELECT code FROM standard_specs WHERE canonical_key = ?", key)
  if (existing) throw new Error(`${existing.code} already exists in the library (key ${key}).`)
  const id = newId()
  const now = nowIso()
  run(
    db,
    `INSERT INTO standard_specs (id, body, code, part_family, canonical_key, mechanical, notes, source_ref, origin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PLANT', ?, ?)`,
    id, input.body, code, input.part_family.trim().toLowerCase().replace(/\s+/g, "_"), key,
    JSON.stringify(input.mechanical), blankToNull(input.notes), blankToNull(input.source_ref), now, now,
  )
  return getSpec(db, id)!
}

export function deleteSpec(db: Db, id: string): void {
  run(db, "DELETE FROM standard_specs WHERE id = ?", id)
}

export type EquivalenceView = StandardEquivalentRow & {
  from_code: string
  from_body: StandardBody
  to_code: string
  to_body: StandardBody
  part_family: string
}

export function listEquivalents(db: Db, query = ""): EquivalenceView[] {
  const q = `%${query.trim()}%`
  return all<EquivalenceView>(
    db,
    `SELECT e.*, f.code AS from_code, f.body AS from_body, t.code AS to_code, t.body AS to_body, f.part_family AS part_family
     FROM standard_equivalents e
     JOIN standard_specs f ON f.id = e.from_spec_id
     JOIN standard_specs t ON t.id = e.to_spec_id
     WHERE ? = '%%' OR f.code LIKE ? OR t.code LIKE ? OR e.notes LIKE ? OR f.part_family LIKE ?
     ORDER BY f.part_family, f.code, CASE e.equivalence WHEN 'EQUIVALENT' THEN 0 WHEN 'NEAR' THEN 1 ELSE 2 END`,
    q, q, q, q, q,
  )
}

export function addEquivalence(
  db: Db,
  input: { from_spec_id: string; to_spec_id: string; equivalence: Equivalence; notes?: string | null; source_ref?: string | null },
): void {
  if (input.from_spec_id === input.to_spec_id) throw new Error("Pick two different standards.")
  const from = getSpec(db, input.from_spec_id)
  const to = getSpec(db, input.to_spec_id)
  if (!from || !to) throw new Error("Standard not found.")
  const existing = get(db, "SELECT id FROM standard_equivalents WHERE from_spec_id = ? AND to_spec_id = ?", from.id, to.id)
  if (existing) throw new Error(`${from.code} → ${to.code} is already recorded.`)
  run(
    db,
    `INSERT INTO standard_equivalents (id, from_spec_id, to_spec_id, equivalence, notes, source_ref, origin, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PLANT', ?)`,
    newId(), from.id, to.id, input.equivalence, blankToNull(input.notes), blankToNull(input.source_ref), nowIso(),
  )
}

export function deleteEquivalence(db: Db, id: string): void {
  run(db, "DELETE FROM standard_equivalents WHERE id = ?", id)
}

export function loadCatalog(db: Db): StandardsCatalog {
  const specs = all<{ id: string; body: StandardBody; code: string; part_family: string; canonical_key: string }>(
    db,
    "SELECT id, body, code, part_family, canonical_key FROM standard_specs",
  )
  const equivalents = all<{ from_spec_id: string; to_spec_id: string; equivalence: Equivalence }>(
    db,
    "SELECT from_spec_id, to_spec_id, equivalence FROM standard_equivalents",
  )
  return {
    specs: specs.map((s) => ({ id: s.id, body: s.body, code: s.code, partFamily: s.part_family, canonicalKey: s.canonical_key })),
    equivalents: equivalents.map((e) => ({ fromSpecId: e.from_spec_id, toSpecId: e.to_spec_id, equivalence: e.equivalence })),
  }
}

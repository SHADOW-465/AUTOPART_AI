import type { Db } from "@/lib/db/client"
import type { AuditEvent, Bom, BomItem, StandardSpec } from "@/lib/db/types"
import { listAlternativesForBom, type AlternativeView } from "@/lib/repo/alternatives"
import { listEventsForBom } from "@/lib/repo/audit"
import { getBom, listItems } from "@/lib/repo/boms"
import { listRfqs, type RfqView } from "@/lib/repo/rfqs"
import { all } from "@/lib/repo/sql"
import { getSpec } from "@/lib/repo/standards"
import { validateSwap, type ValidationResult } from "@/lib/validation/rules"
import { lineDelta, summarizeBom, type BomSummary, type LineDelta } from "./savings"

export type AlternativeLine = AlternativeView & { delta: LineDelta }

export type LineView = {
  item: BomItem
  fromSpec: StandardSpec | null
  toSpec: StandardSpec | null
  equivalenceNotes: string | null
  validation: ValidationResult | null
  alternatives: AlternativeLine[]
  accepted: AlternativeLine | null
  rfqs: RfqView[]
}

export type BomDetail = {
  bom: Bom
  lines: LineView[]
  summary: BomSummary
  events: AuditEvent[]
  rfqs: RfqView[]
}

export function loadBomDetail(db: Db, bomId: string): BomDetail | null {
  const bom = getBom(db, bomId)
  if (!bom) return null
  const items = listItems(db, bomId)
  const alternatives = listAlternativesForBom(db, bomId)
  const rfqs = listRfqs(db, { bomId })

  const specCache = new Map<string, StandardSpec | null>()
  const spec = (id: string | null) => {
    if (!id) return null
    if (!specCache.has(id)) specCache.set(id, getSpec(db, id))
    return specCache.get(id)!
  }
  const notes = new Map(
    all<{ from_spec_id: string; to_spec_id: string; notes: string | null }>(
      db,
      "SELECT from_spec_id, to_spec_id, notes FROM standard_equivalents",
    ).map((r) => [`${r.from_spec_id}|${r.to_spec_id}`, r.notes]),
  )

  const lines: LineView[] = items.map((item) => {
    const fromSpec = spec(item.from_spec_id)
    const toSpec = spec(item.to_spec_id)
    const lineAlternatives = alternatives
      .filter((a) => a.bom_item_id === item.id)
      .map((a) => ({ ...a, delta: lineDelta(item.current_unit_cost, a.unit_cost, item.quantity, bom.annual_volume) }))
    const validation =
      item.match_status === "MATCHED" && fromSpec && toSpec
        ? validateSwap({
            equivalence: item.equivalence,
            from: { code: fromSpec.code, partFamily: fromSpec.part_family, mechanical: fromSpec.mechanical },
            to: { code: toSpec.code, partFamily: toSpec.part_family, mechanical: toSpec.mechanical },
            originalSpecText: [item.original_spec, item.part_name].filter(Boolean).join(" "),
          })
        : null
    return {
      item,
      fromSpec,
      toSpec,
      equivalenceNotes: fromSpec && toSpec ? (notes.get(`${fromSpec.id}|${toSpec.id}`) ?? null) : null,
      validation,
      alternatives: lineAlternatives,
      accepted: lineAlternatives.find((a) => a.status === "ACCEPTED") ?? null,
      rfqs: rfqs.filter((r) => r.bom_item_id === item.id),
    }
  })

  return {
    bom,
    lines,
    summary: summarizeBom(items, alternatives, bom.annual_volume),
    events: listEventsForBom(db, bomId),
    rfqs,
  }
}

import type { Db } from "@/lib/db/client"
import type { Bom, CustomerStatus, MatchStatus, AlternativeStatus } from "@/lib/db/types"
import { listBoms } from "@/lib/repo/boms"
import { countOpenRfqs } from "@/lib/repo/rfqs"
import { all } from "@/lib/repo/sql"
import { lineDelta, summarizeBom, type BomSummary, type DecisionRecord } from "./savings"

export type BomRow = Bom & { summary: BomSummary }

export type WorkspaceOverview = {
  boms: BomRow[]
  totals: {
    boms: number
    lines: number
    matched: number
    needsReview: number
    accepted: number
    pendingApproval: number
    approved: number
    proposedAnnual: number
    approvedAnnual: number
    openRfqs: number
    matchRate: number
  }
  decisions: (DecisionRecord & { bom_id: string })[]
}

type ItemRow = { id: string; bom_id: string; quantity: number; current_unit_cost: number | null; match_status: MatchStatus; category: string | null }
type AltRow = { bom_item_id: string; unit_cost: number | null; status: AlternativeStatus; customer_status: CustomerStatus; decided_at: string | null; customer_updated_at: string | null }

export function loadWorkspace(db: Db): WorkspaceOverview {
  const boms = listBoms(db)
  const items = all<ItemRow>(db, "SELECT id, bom_id, quantity, current_unit_cost, match_status, category FROM bom_items")
  const alts = all<AltRow>(
    db,
    "SELECT bom_item_id, unit_cost, status, customer_status, decided_at, customer_updated_at FROM part_alternatives WHERE status = 'ACCEPTED'",
  )
  const itemsByBom = new Map<string, ItemRow[]>()
  for (const item of items) {
    const list = itemsByBom.get(item.bom_id) ?? []
    list.push(item)
    itemsByBom.set(item.bom_id, list)
  }
  const itemById = new Map(items.map((i) => [i.id, i]))
  const altsByBom = new Map<string, AltRow[]>()
  for (const alt of alts) {
    const bomId = itemById.get(alt.bom_item_id)?.bom_id
    if (!bomId) continue
    const list = altsByBom.get(bomId) ?? []
    list.push(alt)
    altsByBom.set(bomId, list)
  }

  const bomRows: BomRow[] = boms.map((bom) => ({
    ...bom,
    summary: summarizeBom(itemsByBom.get(bom.id) ?? [], altsByBom.get(bom.id) ?? [], bom.annual_volume),
  }))

  const volumeByBom = new Map(boms.map((b) => [b.id, b.annual_volume]))
  const decisions = alts.flatMap((alt) => {
    const item = itemById.get(alt.bom_item_id)
    if (!item) return []
    const annual = lineDelta(item.current_unit_cost, alt.unit_cost, item.quantity, volumeByBom.get(item.bom_id) ?? 0).annual
    if (annual == null) return []
    return [{ bom_id: item.bom_id, annual, category: item.category, decided_at: alt.decided_at, customer_status: alt.customer_status, customer_updated_at: alt.customer_updated_at }]
  })

  const sum = (pick: (s: BomSummary) => number) => bomRows.reduce((acc, b) => acc + pick(b.summary), 0)
  const lines = sum((s) => s.lines)
  const matched = sum((s) => s.matched)
  return {
    boms: bomRows,
    totals: {
      boms: bomRows.length,
      lines,
      matched,
      needsReview: sum((s) => s.needsReview),
      accepted: sum((s) => s.accepted),
      pendingApproval: sum((s) => s.pendingApproval),
      approved: sum((s) => s.approved),
      proposedAnnual: sum((s) => s.proposedAnnual),
      approvedAnnual: sum((s) => s.approvedAnnual),
      openRfqs: countOpenRfqs(db),
      matchRate: lines > 0 ? matched / lines : 0,
    },
    decisions,
  }
}

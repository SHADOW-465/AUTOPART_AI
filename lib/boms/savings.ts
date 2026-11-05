import type { AlternativeStatus, CustomerStatus, MatchStatus } from "@/lib/db/types"

export type LineDelta = {
  unitDelta: number | null
  pct: number | null
  perVehicle: number | null
  annual: number | null
}

/** Positive values are savings; negative values mean the alternative costs more. */
export function lineDelta(
  currentUnitCost: number | null,
  altUnitCost: number | null,
  quantity: number,
  annualVolume: number,
): LineDelta {
  if (currentUnitCost == null || altUnitCost == null) {
    return { unitDelta: null, pct: null, perVehicle: null, annual: null }
  }
  const unitDelta = currentUnitCost - altUnitCost
  const perVehicle = unitDelta * quantity
  return {
    unitDelta,
    pct: currentUnitCost > 0 ? (unitDelta / currentUnitCost) * 100 : null,
    perVehicle,
    annual: perVehicle * annualVolume,
  }
}

export type SummaryItem = {
  quantity: number
  current_unit_cost: number | null
  match_status: MatchStatus
}

export type SummaryAlternative = {
  bom_item_id: string
  unit_cost: number | null
  status: AlternativeStatus
  customer_status: CustomerStatus
}

export type BomSummary = {
  lines: number
  matched: number
  needsReview: number
  accepted: number
  approved: number
  pendingApproval: number
  costPerVehicle: number
  proposedCostPerVehicle: number
  proposedAnnual: number
  approvedAnnual: number
  matchRate: number
}

export function summarizeBom(
  items: (SummaryItem & { id: string })[],
  alternatives: SummaryAlternative[],
  annualVolume: number,
): BomSummary {
  const acceptedByItem = new Map<string, SummaryAlternative>()
  for (const alt of alternatives) if (alt.status === "ACCEPTED") acceptedByItem.set(alt.bom_item_id, alt)

  let costPerVehicle = 0
  let proposedCostPerVehicle = 0
  let proposedAnnual = 0
  let approvedAnnual = 0
  let matched = 0
  let approved = 0
  let pendingApproval = 0

  for (const item of items) {
    if (item.match_status === "MATCHED") matched += 1
    const accepted = acceptedByItem.get(item.id)
    const current = item.current_unit_cost
    if (current != null) {
      costPerVehicle += current * item.quantity
      const live = accepted && accepted.customer_status !== "REJECTED" && accepted.unit_cost != null
      proposedCostPerVehicle += (live ? accepted.unit_cost! : current) * item.quantity
    }
    if (!accepted) continue
    if (accepted.customer_status === "APPROVED") approved += 1
    if (accepted.customer_status === "NOT_SUBMITTED" || accepted.customer_status === "SUBMITTED") pendingApproval += 1
    const delta = lineDelta(current, accepted.unit_cost, item.quantity, annualVolume)
    if (delta.annual == null) continue
    if (accepted.customer_status !== "REJECTED") proposedAnnual += delta.annual
    if (accepted.customer_status === "APPROVED") approvedAnnual += delta.annual
  }

  return {
    lines: items.length,
    matched,
    needsReview: items.length - matched,
    accepted: acceptedByItem.size,
    approved,
    pendingApproval,
    costPerVehicle,
    proposedCostPerVehicle,
    proposedAnnual,
    approvedAnnual,
    matchRate: items.length > 0 ? matched / items.length : 0,
  }
}

export type DecisionRecord = {
  annual: number
  category: string | null
  decided_at: string | null
  customer_status: CustomerStatus
  customer_updated_at: string | null
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

/** Annual savings bucketed by the month the plant accepted (proposed) and the customer approved. */
export function savingsByMonth(records: DecisionRecord[]): { month: string; proposed: number; approved: number }[] {
  const map = new Map<string, { proposed: number; approved: number }>()
  const bucket = (key: string) => {
    if (!map.has(key)) map.set(key, { proposed: 0, approved: 0 })
    return map.get(key)!
  }
  for (const r of records) {
    if (r.customer_status !== "REJECTED" && r.decided_at) bucket(monthKey(r.decided_at)).proposed += r.annual
    if (r.customer_status === "APPROVED" && r.customer_updated_at) bucket(monthKey(r.customer_updated_at)).approved += r.annual
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }))
}

export function savingsByCategory(records: DecisionRecord[]): { category: string; proposed: number; approved: number }[] {
  const map = new Map<string, { proposed: number; approved: number }>()
  for (const r of records) {
    if (r.customer_status === "REJECTED") continue
    const key = r.category?.trim() || "Uncategorised"
    const entry = map.get(key) ?? { proposed: 0, approved: 0 }
    entry.proposed += r.annual
    if (r.customer_status === "APPROVED") entry.approved += r.annual
    map.set(key, entry)
  }
  return [...map.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.proposed - a.proposed)
}

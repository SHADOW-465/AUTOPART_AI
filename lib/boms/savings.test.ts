import { describe, expect, it } from "vitest"
import { lineDelta, savingsByCategory, savingsByMonth, summarizeBom, type SummaryAlternative } from "./savings"

describe("lineDelta", () => {
  it("computes unit, percent, per-vehicle and annual deltas", () => {
    expect(lineDelta(10, 8, 4, 1000)).toEqual({ unitDelta: 2, pct: 20, perVehicle: 8, annual: 8000 })
  })
  it("returns negative values when the alternative costs more", () => {
    expect(lineDelta(5, 6, 2, 100).annual).toBe(-200)
  })
  it("is unknown when either cost is missing", () => {
    expect(lineDelta(null, 3, 1, 1).annual).toBeNull()
    expect(lineDelta(3, null, 1, 1).pct).toBeNull()
  })
})

describe("summarizeBom", () => {
  const items = [
    { id: "a", quantity: 4, current_unit_cost: 10, match_status: "MATCHED" as const },
    { id: "b", quantity: 2, current_unit_cost: 5, match_status: "MATCHED" as const },
    { id: "c", quantity: 1, current_unit_cost: null, match_status: "NEEDS_REVIEW" as const },
  ]
  const alt = (o: Partial<SummaryAlternative>): SummaryAlternative => ({
    bom_item_id: "a",
    unit_cost: 8,
    status: "ACCEPTED",
    customer_status: "NOT_SUBMITTED",
    ...o,
  })

  it("separates proposed from customer-approved savings", () => {
    const summary = summarizeBom(
      items,
      [alt({}), alt({ bom_item_id: "b", unit_cost: 4, customer_status: "APPROVED" }), alt({ bom_item_id: "b", status: "REJECTED" })],
      100,
    )
    expect(summary).toMatchObject({
      lines: 3,
      matched: 2,
      needsReview: 1,
      accepted: 2,
      approved: 1,
      pendingApproval: 1,
      costPerVehicle: 50,
      proposedCostPerVehicle: 40,
      proposedAnnual: 1000,
      approvedAnnual: 200,
    })
    expect(summary.matchRate).toBeCloseTo(2 / 3)
  })

  it("drops customer-rejected swaps from proposed savings", () => {
    const summary = summarizeBom(items, [alt({ customer_status: "REJECTED" })], 100)
    expect(summary.proposedAnnual).toBe(0)
    expect(summary.proposedCostPerVehicle).toBe(50)
  })
})

describe("savings series", () => {
  const records = [
    { annual: 100, category: "Fasteners", decided_at: "2026-09-02T00:00:00Z", customer_status: "APPROVED" as const, customer_updated_at: "2026-10-05T00:00:00Z" },
    { annual: 50, category: null, decided_at: "2026-10-01T00:00:00Z", customer_status: "SUBMITTED" as const, customer_updated_at: null },
    { annual: 70, category: "Fasteners", decided_at: "2026-10-01T00:00:00Z", customer_status: "REJECTED" as const, customer_updated_at: "2026-10-09T00:00:00Z" },
  ]
  it("buckets by month", () => {
    expect(savingsByMonth(records)).toEqual([
      { month: "2026-09", proposed: 100, approved: 0 },
      { month: "2026-10", proposed: 50, approved: 100 },
    ])
  })
  it("groups by category", () => {
    expect(savingsByCategory(records)).toEqual([
      { category: "Fasteners", proposed: 100, approved: 100 },
      { category: "Uncategorised", proposed: 50, approved: 0 },
    ])
  })
})

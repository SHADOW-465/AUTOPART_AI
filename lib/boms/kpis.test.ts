import { describe, expect, it } from "vitest"
import { computeKpis, lineSavings } from "./kpis"

describe("computeKpis", () => {
  it("returns empty state when no accepted alternatives", () => {
    const result = computeKpis([{ id: "b1", created_at: "2026-09-01T00:00:00Z" }], [], new Date("2026-09-15T12:00:00Z"))
    expect(result.empty).toBe(true)
    expect(result.monthlySavings).toBe(0)
    expect(result.bomsProcessed).toBe(1)
    expect(result.complianceRate).toBe(0)
  })

  it("returns 50% compliance when one of two accepted alts is AIS compliant", () => {
    const now = new Date("2026-09-15T12:00:00Z")
    const result = computeKpis(
      [
        { id: "b1", created_at: "2026-09-01T00:00:00Z" },
        { id: "b2", created_at: "2026-09-10T00:00:00Z" },
      ],
      [
        {
          is_ais_compliant: true,
          updated_at: "2026-09-10T00:00:00Z",
          alternative_unit_cost: 8,
          quantity: 10,
          current_unit_cost: 12,
        },
        {
          is_ais_compliant: false,
          updated_at: "2026-09-12T00:00:00Z",
          alternative_unit_cost: 2,
          quantity: 5,
          current_unit_cost: 4,
        },
      ],
      now,
    )
    expect(result.empty).toBe(false)
    expect(result.complianceRate).toBe(0.5)
    expect(result.bomsProcessed).toBe(2)
    expect(result.monthlySavings).toBe(10 * (12 - 8) + 5 * (4 - 2))
  })

  it("counts monthly savings only for the current calendar month", () => {
    const now = new Date("2026-09-15T12:00:00Z")
    const result = computeKpis(
      [],
      [
        {
          is_ais_compliant: true,
          updated_at: "2026-08-31T00:00:00Z",
          alternative_unit_cost: 1,
          quantity: 100,
          current_unit_cost: 2,
        },
        {
          is_ais_compliant: true,
          updated_at: "2026-09-01T00:00:00Z",
          alternative_unit_cost: 1,
          quantity: 3,
          current_unit_cost: 5,
        },
      ],
      now,
    )
    expect(result.monthlySavings).toBe(3 * (5 - 1))
  })

  it("counts BOMs processed only for the current calendar month", () => {
    const now = new Date("2026-09-15T12:00:00Z")
    const result = computeKpis(
      [
        { id: "old", created_at: "2026-08-15T12:00:00Z" },
        { id: "new", created_at: "2026-09-15T12:00:00Z" },
      ],
      [],
      now,
    )
    expect(result.bomsProcessed).toBe(1)
  })

  it("treats missing costs as zero savings for that line", () => {
    expect(
      lineSavings({
        is_ais_compliant: true,
        updated_at: "2026-09-01T00:00:00Z",
        alternative_unit_cost: null,
        quantity: 10,
        current_unit_cost: 5,
      }),
    ).toBe(0)
  })
})

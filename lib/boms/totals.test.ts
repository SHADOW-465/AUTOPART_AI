import { describe, expect, it } from "vitest"
import { computeBomTotals } from "./totals"

describe("computeBomTotals", () => {
  it("uses accepted alternative cost when present", () => {
    const result = computeBomTotals([
      { quantity: 2500, currentUnitCost: 12.5, acceptedAlternativeUnitCost: 8.2 },
      { quantity: 5000, currentUnitCost: 3.2, acceptedAlternativeUnitCost: 1.5 },
    ])
    expect(result.totalOriginalCost).toBe(12.5 * 2500 + 3.2 * 5000)
    expect(result.totalOptimizedCost).toBe(8.2 * 2500 + 1.5 * 5000)
    expect(result.totalSavingsPct).toBeCloseTo(
      (100 * (result.totalOriginalCost - result.totalOptimizedCost)) / result.totalOriginalCost,
    )
  })

  it("keeps original cost when no alternative accepted", () => {
    const result = computeBomTotals([
      { quantity: 10, currentUnitCost: 5, acceptedAlternativeUnitCost: null },
    ])
    expect(result.totalOriginalCost).toBe(50)
    expect(result.totalOptimizedCost).toBe(50)
    expect(result.totalSavingsPct).toBe(0)
  })

  it("excludes lines with null original cost from percentage", () => {
    const result = computeBomTotals([
      { quantity: 10, currentUnitCost: null, acceptedAlternativeUnitCost: 1 },
      { quantity: 2, currentUnitCost: 10, acceptedAlternativeUnitCost: 4 },
    ])
    expect(result.totalOriginalCost).toBe(20)
    expect(result.totalOptimizedCost).toBe(8)
    expect(result.totalSavingsPct).toBe(60)
  })

  it("returns 0% when no priced original lines", () => {
    const result = computeBomTotals([
      { quantity: 1, currentUnitCost: null, acceptedAlternativeUnitCost: null },
    ])
    expect(result.totalOriginalCost).toBe(0)
    expect(result.totalOptimizedCost).toBe(0)
    expect(result.totalSavingsPct).toBe(0)
  })
})

import { describe, expect, it } from "vitest"
import { statusesAfterAccept } from "./accept"
import { computeBomTotals } from "./totals"

describe("statusesAfterAccept", () => {
  it("accepts one alternative and rejects siblings", () => {
    expect(statusesAfterAccept(["a", "b", "c"], "b")).toEqual({
      a: "REJECTED",
      b: "ACCEPTED",
      c: "REJECTED",
    })
  })
})

describe("totals after accept", () => {
  it("uses accepted alternative unit cost", () => {
    const totals = computeBomTotals([
      { quantity: 10, currentUnitCost: 5, acceptedAlternativeUnitCost: 3 },
      { quantity: 2, currentUnitCost: 20, acceptedAlternativeUnitCost: null },
    ])
    expect(totals.totalOriginalCost).toBe(90)
    expect(totals.totalOptimizedCost).toBe(70)
  })
})

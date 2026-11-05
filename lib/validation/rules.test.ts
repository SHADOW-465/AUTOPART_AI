import { describe, expect, it } from "vitest"
import { validateSwap, type SpecForValidation } from "./rules"

const din912: SpecForValidation = {
  code: "DIN 912",
  partFamily: "hex_socket_cap_screw",
  mechanical: { property_class: "8.8", tensile_mpa_min: 800, yield_mpa_min: 640, thread_fit: "6g" },
}
const is1367: SpecForValidation = { ...din912, code: "IS 1367 Part 3" }

function statusOf(result: ReturnType<typeof validateSwap>, id: string) {
  return result.checks.find((c) => c.id === id)?.status
}

describe("validateSwap", () => {
  it("passes an exact equivalent", () => {
    const result = validateSwap({ equivalence: "EQUIVALENT", from: din912, to: is1367, originalSpecText: "DIN 912 M6x20 8.8" })
    expect(result.recommendation).toBe("SAFE_TO_SWITCH")
    expect(result.material).toBe("EQUIVALENT")
    expect(result.dimensional).toBe("INTERCHANGEABLE")
    expect(result.checks.every((c) => c.status === "pass")).toBe(true)
  })

  it("requires testing for near-equivalents", () => {
    const result = validateSwap({ equivalence: "NEAR", from: din912, to: is1367, originalSpecText: "" })
    expect(result.recommendation).toBe("REQUIRES_TESTING")
    expect(result.dimensional).toBe("REQUIRES_MODIFICATION")
  })

  it("rejects a weaker replacement", () => {
    const weak = { ...is1367, mechanical: { ...is1367.mechanical, property_class: "5.6", tensile_mpa_min: 500 } }
    const result = validateSwap({ equivalence: "EQUIVALENT", from: din912, to: weak, originalSpecText: "" })
    expect(result.recommendation).toBe("NOT_RECOMMENDED")
    expect(result.material).toBe("INFERIOR")
    expect(statusOf(result, "property_class")).toBe("fail")
    expect(statusOf(result, "tensile_mpa_min")).toBe("fail")
  })

  it("marks a stronger replacement as superior", () => {
    const strong = { ...is1367, mechanical: { ...is1367.mechanical, property_class: "10.9", tensile_mpa_min: 1040, yield_mpa_min: 940 } }
    const result = validateSwap({ equivalence: "EQUIVALENT", from: din912, to: strong, originalSpecText: "" })
    expect(result.material).toBe("SUPERIOR")
    expect(result.recommendation).toBe("SAFE_TO_SWITCH")
  })

  it("flags a family mismatch as incompatible", () => {
    const nut = { ...is1367, partFamily: "hex_nut" }
    const result = validateSwap({ equivalence: "EQUIVALENT", from: din912, to: nut, originalSpecText: "" })
    expect(result.recommendation).toBe("NOT_RECOMMENDED")
    expect(result.material).toBe("INCOMPATIBLE")
    expect(result.dimensional).toBe("INCOMPATIBLE")
  })

  it("warns when a zinc-flake coating is called out", () => {
    const result = validateSwap({
      equivalence: "EQUIVALENT",
      from: din912,
      to: is1367,
      originalSpecText: "DIN 912 M6x20 8.8 zinc flake ISO 10683",
    })
    expect(statusOf(result, "coating")).toBe("warn")
    expect(result.checks.find((c) => c.id === "coating")?.detail).toContain("IS 16647")
    expect(result.recommendation).toBe("REQUIRES_TESTING")
  })

  it("warns when data is missing on one side", () => {
    const bare = { ...is1367, mechanical: {} }
    const result = validateSwap({ equivalence: "EQUIVALENT", from: din912, to: bare, originalSpecText: "" })
    expect(statusOf(result, "tensile_mpa_min")).toBe("warn")
    expect(result.recommendation).toBe("REQUIRES_TESTING")
  })

  it("fails without a recorded equivalence", () => {
    const result = validateSwap({ equivalence: null, from: null, to: null, originalSpecText: "CUSTOM" })
    expect(result.recommendation).toBe("NOT_RECOMMENDED")
    expect(result.checks).toHaveLength(1)
  })
})

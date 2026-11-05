import { describe, expect, it } from "vitest"
import { canonicalizeSpec } from "./canonicalize"
import { matchEquivalent, type StandardsCatalog } from "./lookup"

const catalog: StandardsCatalog = {
  specs: [
    {
      id: "din-912",
      body: "DIN",
      code: "DIN 912",
      partFamily: "hex_socket_cap_screw",
      canonicalKey: "DIN912",
    },
    {
      id: "is-1367-3",
      body: "IS",
      code: "IS 1367 Part 3",
      partFamily: "hex_socket_cap_screw",
      canonicalKey: "IS1367PART3",
    },
  ],
  equivalents: [
    { fromSpecId: "din-912", toSpecId: "is-1367-3", equivalence: "EQUIVALENT" },
  ],
}

describe("matchEquivalent", () => {
  it("maps DIN 912 to IS 1367 Part 3", () => {
    const key = canonicalizeSpec("DIN 912 M6x20 8.8")
    const result = matchEquivalent(key, catalog)
    if (result.status !== "MATCHED") throw new Error(`expected MATCHED, got ${result.status}`)
    expect(result.toSpec.code).toBe("IS 1367 Part 3")
    expect(result.equivalence).toBe("EQUIVALENT")
  })

  it("flags unknown specs", () => {
    const result = matchEquivalent(canonicalizeSpec("CUSTOM BRACKET 400MPA"), catalog)
    expect(result).toEqual({ status: "NEEDS_REVIEW" })
  })
})

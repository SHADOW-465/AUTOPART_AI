import { describe, expect, it } from "vitest"
import { canonicalizeSpec } from "./canonicalize"

describe("canonicalizeSpec", () => {
  it("normalizes DIN 912 M6x20 8.8", () => {
    expect(canonicalizeSpec("DIN 912 M6x20 8.8")).toBe("DIN912|M6X20|8.8")
  })

  it("treats × and x as the same", () => {
    expect(canonicalizeSpec("DIN 912 M6×20 8.8")).toBe("DIN912|M6X20|8.8")
  })

  it("collapses extra space and punctuation", () => {
    expect(canonicalizeSpec("  din-912,  M6 x 20  grade 8.8 ")).toBe("DIN912|M6X20|8.8")
  })

  it("keeps IS codes", () => {
    expect(canonicalizeSpec("IS 1367 (Part 3) M6x20 8.8")).toBe("IS1367PART3|M6X20|8.8")
  })
  it("normalises Indian Standard part notation", () => {
    expect(canonicalizeSpec("IS 1364-2 M8x25 8.8")).toBe("IS1364PART2|M8X25|8.8")
    expect(canonicalizeSpec("IS 1364 (Part 3) M8")).toBe("IS1364PART3")
  })
  it("resolves adopted standards to their source body", () => {
    expect(canonicalizeSpec("DIN EN ISO 4017 M8x25 8.8")).toBe("ISO4017|M8X25|8.8")
    expect(canonicalizeSpec("EN ISO 4762 M6x20")).toBe("ISO4762|M6X20")
    expect(canonicalizeSpec("DIN EN 10130 FeP04")).toBe("EN10130")
  })
  it("finds the standard when it is not the first word", () => {
    expect(canonicalizeSpec("Bolt to DIN 933 M8x25 8.8")).toBe("DIN933|M8X25|8.8")
  })
  it("keys material grades on their first token", () => {
    expect(canonicalizeSpec("16MnCr5 (1.7131)")).toBe("16MNCR5")
  })
})

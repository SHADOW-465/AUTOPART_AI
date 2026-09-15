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
})

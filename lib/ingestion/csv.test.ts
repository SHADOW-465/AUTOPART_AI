import { describe, expect, it } from "vitest"
import { parseCsvFile } from "./csv"

describe("parseCsvFile", () => {
  it("parses messy.csv fixture", () => {
    const rows = parseCsvFile("tests/fixtures/messy.csv")
    expect(rows).toHaveLength(2)
    expect(Object.values(rows[0].cells)).toContain("Hex Socket Bolt")
    expect(rows[1].cells["Matl."]).toContain("DIN 125")
  })
})

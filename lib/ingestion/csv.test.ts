import { describe, expect, it } from "vitest"
import { parseCsv, parseCsvFile } from "./csv"

describe("parseCsvFile", () => {
  it("parses messy.csv fixture", () => {
    const rows = parseCsvFile("tests/fixtures/messy.csv")
    expect(rows).toHaveLength(2)
    expect(Object.values(rows[0].cells)).toContain("Hex Socket Bolt")
    expect(rows[1].cells["Matl."]).toContain("DIN 125")
  })
})

describe("parseCsv", () => {
  it("handles escaped quotes, a byte-order mark and semicolons", () => {
    const rows = parseCsv('﻿Description;Spec\n"Bolt ""long""";DIN 931\n\n')
    expect(rows).toEqual([{ sourceLine: 2, cells: { Description: 'Bolt "long"', Spec: "DIN 931" } }])
  })
})

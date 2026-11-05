import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { openDatabase } from "@/lib/db/client"
import { acceptAlternative, setCustomerStatus } from "@/lib/repo/alternatives"
import { buildBomCsv, csvCell, EXPORT_HEADERS, exportFilename } from "./export"
import { importBom } from "./import"
import { loadBomDetail } from "./view"

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('Bolt, "hex"')).toBe('"Bolt, ""hex"""')
    expect(csvCell("a\nb")).toBe('"a\nb"')
  })
  it("neutralises formula injection in text but not in numbers", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)")
    expect(csvCell("-5")).toBe("'-5")
    expect(csvCell(-5)).toBe("-5")
  })
  it("rounds numbers and renders empties and booleans", () => {
    expect(csvCell(1.23456)).toBe("1.23")
    expect(csvCell(null)).toBe("")
    expect(csvCell(Number.NaN)).toBe("")
    expect(csvCell(true)).toBe("Yes")
  })
})

describe("buildBomCsv", () => {
  it("exports one row per line with the proposal, validation and approval state", async () => {
    const db = openDatabase(":memory:")
    const bytes = new Uint8Array(readFileSync("public/samples/sample-bom.csv"))
    const result = await importBom(db, { filename: "sample.csv", mime: "text/csv", bytes, annual_volume: 1000 })
    const bomId = (result as { bomId: string }).bomId
    const before = loadBomDetail(db, bomId)!
    const first = before.lines[0].alternatives[0]
    acceptAlternative(db, first.id)
    setCustomerStatus(db, first.id, { customer_status: "APPROVED", customer_ref: "PPAP-7", customer_notes: null })

    const csv = buildBomCsv(loadBomDetail(db, bomId)!.lines)
    const lines = csv.trimEnd().split("\r\n")
    expect(lines[0]).toBe(EXPORT_HEADERS.join(","))
    expect(lines).toHaveLength(14)
    expect(lines[1]).toBe(
      "1,FA-1001,Hex socket head cap screw,Fasteners,DIN 912 M6x20 8.8,8,5.8,Matched,DIN 912,IS 1367 Part 3,Equivalent,Safe to switch," +
        "ChennaiFasteners (seed),Not recorded,Yes,4.5,22.41,10.4,10400,7,Accepted,Customer approved,PPAP-7",
    )
    expect(lines[12]).toBe("12,RB-3001,Coolant hose,Rubber,EPDM hose 19 mm ID,1,240,Needs review,,,,,,,,,,,,,,,")
  })
})

describe("exportFilename", () => {
  it("strips unsafe characters", () => {
    expect(exportFilename("BOM/2026 #4")).toBe("BOM-2026-4-localization-proposal.csv")
    expect(exportFilename("///")).toBe("bom-localization-proposal.csv")
  })
})

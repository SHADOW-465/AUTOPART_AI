import { describe, expect, it } from "vitest"
import type { BomItem, PartAlternative, TechnicalValidation } from "@/lib/db/types"
import { buildBomCsv, csvCell, EXPORT_HEADERS, exportFilename, proposalFor } from "./export"

function item(overrides: Partial<BomItem>): BomItem {
  return {
    id: "item-1",
    bom_id: "bom-1",
    tenant_id: "t-1",
    line_number: 1,
    part_number: "P-100",
    part_name: "Hex bolt",
    category: "Fasteners",
    original_spec: "ISO 4017 M8x25 8.8",
    canonical_spec_key: null,
    material_grade: null,
    quantity_per_vehicle: 4,
    current_unit_cost: 12.5,
    current_supplier_name: null,
    match_status: "MATCHED",
    extraction_confidence: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

function alt(overrides: Partial<PartAlternative>): PartAlternative {
  return {
    id: "alt-1",
    bom_item_id: "item-1",
    tenant_id: "t-1",
    supplier_id: null,
    standard_spec_id: null,
    rank_order: 1,
    alternative_spec: "IS 1364-2 M8x25 8.8",
    indian_standard_code: "IS 1364 (Part 2)",
    alternative_unit_cost: 9,
    savings_percentage: 28,
    lead_time_days: 5,
    is_ais_compliant: true,
    confidence_score: null,
    status: "SUGGESTED",
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

describe("proposalFor", () => {
  it("prefers the accepted alternative over a better-ranked suggestion", () => {
    const alts = [alt({ id: "a", rank_order: 1 }), alt({ id: "b", rank_order: 2, status: "ACCEPTED" })]
    expect(proposalFor("item-1", alts)?.id).toBe("b")
  })

  it("falls back to the best-ranked non-rejected suggestion", () => {
    const alts = [
      alt({ id: "a", rank_order: 1, status: "REJECTED" }),
      alt({ id: "c", rank_order: 3 }),
      alt({ id: "b", rank_order: 2 }),
    ]
    expect(proposalFor("item-1", alts)?.id).toBe("b")
  })

  it("returns null when nothing usable exists for the line", () => {
    expect(proposalFor("item-1", [alt({ status: "REJECTED" }), alt({ bom_item_id: "other" })])).toBeNull()
  })
})

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

  it("renders empty values and booleans", () => {
    expect(csvCell(null)).toBe("")
    expect(csvCell(undefined)).toBe("")
    expect(csvCell(Number.NaN)).toBe("")
    expect(csvCell(true)).toBe("Yes")
    expect(csvCell(false)).toBe("No")
  })
})

describe("buildBomCsv", () => {
  it("writes a header plus one row per line item in line order", () => {
    const items = [item({ id: "item-2", line_number: 2, part_name: "Washer" }), item({})]
    const validation = { recommendation: "SAFE_TO_SWITCH" } as TechnicalValidation
    const csv = buildBomCsv(items, [alt({ status: "ACCEPTED" })], { "alt-1": validation })
    const lines = csv.trimEnd().split("\r\n")

    expect(lines[0]).toBe(EXPORT_HEADERS.join(","))
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe(
      "1,P-100,Hex bolt,Fasteners,ISO 4017 M8x25 8.8,4,12.5,MATCHED,IS 1364 (Part 2),IS 1364-2 M8x25 8.8,9,28,5,Yes,Accepted by plant - pending customer approval,SAFE TO SWITCH",
    )
    expect(lines[2]).toBe("2,P-100,Washer,Fasteners,ISO 4017 M8x25 8.8,4,12.5,MATCHED,,,,,,,,")
  })
})

describe("exportFilename", () => {
  it("strips unsafe characters", () => {
    expect(exportFilename("BOM/2026 #4")).toBe("BOM-2026-4-localization-proposal.csv")
    expect(exportFilename("///")).toBe("bom-localization-proposal.csv")
  })
})

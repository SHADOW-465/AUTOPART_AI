import { SAMPLE_BOM_CSV } from "@/lib/samples"
import { beforeEach, describe, expect, it } from "vitest"
import { importBom } from "@/lib/boms/import"
import { loadBomDetail } from "@/lib/boms/view"
import { openDatabase, type Db } from "@/lib/db/client"
import { listRfqs } from "@/lib/repo/rfqs"
import { saveSettings } from "@/lib/repo/settings"
import { listSuppliers, saveSupplier } from "@/lib/repo/suppliers"
import { changeRfqStatus, createRfqForAlternative, recordQuote } from "./service"

let db: Db
let bomId: string

beforeEach(async () => {
  db = openDatabase(":memory:")
  saveSettings(db, { company_name: "Acme Auto", contact_name: "R. Kumar" })
  const bytes = new TextEncoder().encode(SAMPLE_BOM_CSV)
  const result = await importBom(db, { filename: "sample.csv", mime: "text/csv", bytes, annual_volume: 500 })
  bomId = (result as { bomId: string }).bomId
})

function line(partNumber: string) {
  return loadBomDetail(db, bomId)!.lines.find((l) => l.item.part_number === partNumber)!
}

describe("RFQ workflow", () => {
  it("drafts an RFQ from the template with plant settings", () => {
    const alt = line("FA-1001").alternatives[0]
    const rfq = createRfqForAlternative(db, alt.id)
    expect(rfq).toMatchObject({
      status: "DRAFT",
      supplier_name: "ChennaiFasteners (seed)",
      supplier_email: "sales@chennaifasteners.example",
      spec_code: "IS 1367 Part 3",
      annual_quantity: 4000,
      target_unit_cost: 5.8,
      bom_code: expect.stringMatching(/^BOM-/),
      line_number: 1,
    })
    expect(rfq.body).toContain("Acme Auto requests a quotation")
    expect(rfq.body).toContain("R. Kumar")
  })

  it("adds the zinc-flake coating requirement when the source spec calls for it", () => {
    const rfq = createRfqForAlternative(db, line("FA-1002").alternatives[0].id)
    expect(rfq.body).toContain("Zinc-flake to IS 16647")
  })

  it("requires a supplier for spec-only alternatives", () => {
    const specOnly = line("ST-2003").alternatives[0]
    expect(() => createRfqForAlternative(db, specOnly.id)).toThrow("Choose a supplier")
    const supplierId = saveSupplier(db, { name: "Bhilai Plates", iatf_16949: false, iso_9001: true, email: "s@bp.example" })
    expect(createRfqForAlternative(db, specOnly.id, supplierId).supplier_name).toBe("Bhilai Plates")
  })

  it("turns a quote into a priced alternative with savings", () => {
    const specOnly = line("ST-2003").alternatives[0]
    const supplierId = saveSupplier(db, { name: "Bhilai Plates", iatf_16949: true, iso_9001: true })
    const rfq = createRfqForAlternative(db, specOnly.id, supplierId)
    changeRfqStatus(db, rfq.id, "SENT")
    recordQuote(db, rfq.id, { unit_cost: 52, lead_time_days: 6, valid_until: null, notes: "Ex-works Raipur" })

    const plate = line("ST-2003")
    expect(plate.alternatives).toHaveLength(1)
    expect(plate.alternatives[0]).toMatchObject({ supplier_name: "Bhilai Plates", unit_cost: 52, lead_time_days: 6, price_source: "RFQ" })
    expect(plate.alternatives[0].delta.annual).toBe((64 - 52) * 2 * 500)
    expect(listRfqs(db, { bomId })[0]).toMatchObject({ status: "QUOTED", quoted_unit_cost: 52 })
  })

  it("updates an existing offer when the same supplier re-quotes", () => {
    const alt = line("FA-1001").alternatives[0]
    const rfq = createRfqForAlternative(db, alt.id)
    recordQuote(db, rfq.id, { unit_cost: 4.1, lead_time_days: null, valid_until: null, notes: null })
    const after = line("FA-1001").alternatives
    expect(after[0]).toMatchObject({ supplier_id: alt.supplier_id, unit_cost: 4.1 })
    expect(listSuppliers(db).length).toBe(6)
  })

  it("lists open RFQs separately", () => {
    const a = createRfqForAlternative(db, line("FA-1001").alternatives[0].id)
    createRfqForAlternative(db, line("FA-1004").alternatives[0].id)
    changeRfqStatus(db, a.id, "CLOSED")
    expect(listRfqs(db, { open: true })).toHaveLength(1)
    expect(listRfqs(db)).toHaveLength(2)
  })
})

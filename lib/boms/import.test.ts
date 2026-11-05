import { SAMPLE_BOM_CSV } from "@/lib/samples"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { openDatabase, type Db } from "@/lib/db/client"
import { acceptAlternative, listAlternativesForBom, listAlternativesForItem, setCustomerStatus } from "@/lib/repo/alternatives"
import { listEventsForBom } from "@/lib/repo/audit"
import { deleteBom, getBom, listItems, updateItemFields } from "@/lib/repo/boms"
import { addEquivalence, addSpec, listSpecs } from "@/lib/repo/standards"
import { listSuppliers, upsertPrice } from "@/lib/repo/suppliers"
import { classifyFile, importBom, MESSAGES } from "./import"
import { rematchBom, rematchItemById } from "./rematch"

const sample = new TextEncoder().encode(SAMPLE_BOM_CSV)

let db: Db
beforeEach(() => {
  db = openDatabase(":memory:")
})

async function importSample() {
  const result = await importBom(db, { filename: "sample-bom.csv", mime: "text/csv", bytes: sample, annual_volume: 1000 })
  if (!("bomId" in result) || result.error) throw new Error(`import failed: ${JSON.stringify(result)}`)
  return result.bomId
}

function specId(code: string) {
  return listSpecs(db).find((s) => s.code === code)!.id
}

describe("seed", () => {
  it("loads the catalog, suppliers and prices once", () => {
    expect(listSpecs(db).length).toBe(39)
    expect(listSuppliers(db).length).toBe(6)
    const again = openDatabase(":memory:")
    expect(listSpecs(again).length).toBe(39)
  })
})

describe("classifyFile", () => {
  it("rejects legacy and CAD formats with specific messages", () => {
    expect(classifyFile("a.xls", "")).toEqual({ error: MESSAGES.xls })
    expect(classifyFile("a.step", "")).toEqual({ error: MESSAGES.cad })
    expect(classifyFile("a.docx", "")).toEqual({ error: MESSAGES.unsupported })
    expect(classifyFile("a.CSV", "")).toEqual({ kind: "csv" })
  })
})

describe("importBom", () => {
  it("imports the sample, matches standards and builds alternatives", async () => {
    const bomId = await importSample()
    const bom = getBom(db, bomId)!
    expect(bom.status).toBe("ANALYZED")
    expect(bom.annual_volume).toBe(1000)

    const items = listItems(db, bomId)
    expect(items).toHaveLength(13)
    const byPart = Object.fromEntries(items.map((i) => [i.part_number, i]))
    expect(byPart["FA-1001"]).toMatchObject({ match_status: "MATCHED", equivalence: "EQUIVALENT" })
    expect(byPart["FA-1002"].match_status).toBe("MATCHED")
    expect(byPart["ST-2002"]).toMatchObject({ original_spec: null, canonical_spec_key: "16MNCR5", match_status: "MATCHED" })
    expect(byPart["RB-3001"].match_status).toBe("NEEDS_REVIEW")
    expect(byPart["MS-4001"].match_status).toBe("NEEDS_REVIEW")

    const alts = listAlternativesForItem(db, byPart["FA-1001"].id)
    expect(alts).toHaveLength(3)
    expect(alts.map((a) => a.unit_cost)).toEqual([4.5, 4.8, 5.05])
    expect(alts[0]).toMatchObject({ rank_order: 1, supplier_name: "ChennaiFasteners (seed)", indian_standard_code: "IS 1367 Part 3" })

    expect(listAlternativesForItem(db, byPart["RB-3001"].id)).toHaveLength(0)
    expect(listEventsForBom(db, bomId)[0].action).toBe("bom.imported")
  })

  it("creates a spec-only alternative when no supplier has a price", async () => {
    const bomId = await importSample()
    const plate = listItems(db, bomId).find((i) => i.part_number === "ST-2003")!
    const alts = listAlternativesForItem(db, plate.id)
    expect(alts).toHaveLength(1)
    expect(alts[0]).toMatchObject({ supplier_id: null, unit_cost: null, indian_standard_code: "IS 2062 E250" })
  })

  it("fails with a clear message when columns are not recognised and AI is off", async () => {
    const bytes = new TextEncoder().encode("Foo,Bar\n1,2\n")
    const result = await importBom(db, { filename: "x.csv", mime: "text/csv", bytes }, { aiEnabled: false })
    expect(result).toMatchObject({ error: MESSAGES.noColumns })
    const bomId = (result as { bomId: string }).bomId
    expect(getBom(db, bomId)).toMatchObject({ status: "FAILED", error_message: MESSAGES.noColumns })
  })

  it("uses the AI fallback only when headers are unrecognised and AI is enabled", async () => {
    const extractWithAi = vi.fn().mockResolvedValue([
      { lineNumber: 7, partNumber: "X", partName: "Bolt", originalSpec: "DIN 933 M8x20 8.8", quantity: 2, unitCost: 4, supplier: "", material: "", category: "" },
    ])
    const bytes = new TextEncoder().encode("Foo,Bar\nBolt,DIN 933\n")
    const result = await importBom(db, { filename: "x.csv", mime: "text/csv", bytes }, { aiEnabled: true, extractWithAi })
    expect(extractWithAi).toHaveBeenCalledOnce()
    const items = listItems(db, (result as { bomId: string }).bomId)
    expect(items).toMatchObject([{ line_number: 1, match_status: "MATCHED" }])
  })

  it("rejects empty and oversized files before creating a BOM", async () => {
    expect(await importBom(db, { filename: "a.csv", mime: "", bytes: new Uint8Array() })).toEqual({ error: MESSAGES.empty })
    expect(await importBom(db, { filename: "a.csv", mime: "", bytes: new Uint8Array(4 * 1024 * 1024 + 1) })).toEqual({
      error: MESSAGES.tooLarge,
    })
  })
})

describe("decisions and re-matching", () => {
  it("keeps accepted alternatives and customer status through a re-match", async () => {
    const bomId = await importSample()
    const item = listItems(db, bomId).find((i) => i.part_number === "FA-1001")!
    const [, second] = listAlternativesForItem(db, item.id)
    acceptAlternative(db, second.id)
    setCustomerStatus(db, second.id, { customer_status: "SUBMITTED", customer_ref: "ECN-42", customer_notes: null })

    rematchBom(db, bomId)

    const alts = listAlternativesForItem(db, item.id)
    const accepted = alts.filter((a) => a.status === "ACCEPTED")
    expect(accepted).toHaveLength(1)
    expect(accepted[0]).toMatchObject({ id: second.id, customer_status: "SUBMITTED", customer_ref: "ECN-42" })
    expect(alts).toHaveLength(3)
    expect(new Set(alts.map((a) => a.supplier_id)).size).toBe(3)
  })

  it("allows only one accepted alternative per line", async () => {
    const bomId = await importSample()
    const item = listItems(db, bomId).find((i) => i.part_number === "FA-1001")!
    const [a, b] = listAlternativesForItem(db, item.id)
    acceptAlternative(db, a.id)
    acceptAlternative(db, b.id)
    const statuses = listAlternativesForItem(db, item.id).map((x) => [x.id, x.status])
    expect(statuses).toContainEqual([b.id, "ACCEPTED"])
    expect(statuses).toContainEqual([a.id, "REJECTED"])
  })

  it("re-matches an edited line", async () => {
    const bomId = await importSample()
    const hose = listItems(db, bomId).find((i) => i.part_number === "MS-4001")!
    updateItemFields(db, hose.id, { ...hose, original_spec: "ISO 7089 8", quantity: 10 })
    rematchItemById(db, hose.id)
    expect(listItems(db, bomId).find((i) => i.id === hose.id)!.match_status).toBe("MATCHED")
  })

  it("picks up new plant equivalences and prices on re-match", async () => {
    const bomId = await importSample()
    const hose = listItems(db, bomId).find((i) => i.part_number === "RB-3001")!
    updateItemFields(db, hose.id, { ...hose, original_spec: "SAE J20R4 19 mm" })
    const sae = addSpec(db, { body: "SAE", code: "SAE J20R4", part_family: "coolant hose", mechanical: {} })
    const is = addSpec(db, { body: "IS", code: "IS 10655", part_family: "coolant_hose", mechanical: {} })
    addEquivalence(db, { from_spec_id: sae.id, to_spec_id: is.id, equivalence: "EQUIVALENT" })
    const supplier = listSuppliers(db)[0]
    upsertPrice(db, { supplier_id: supplier.id, standard_spec_id: specId("IS 10655"), unit_cost: 180, source: "MANUAL" })

    rematchBom(db, bomId)
    const alts = listAlternativesForItem(db, hose.id)
    expect(alts).toMatchObject([{ indian_standard_code: "IS 10655", unit_cost: 180 }])
  })

  it("refreshes an accepted alternative's price from the price list", async () => {
    const bomId = await importSample()
    const item = listItems(db, bomId).find((i) => i.part_number === "FA-1001")!
    const [first] = listAlternativesForItem(db, item.id)
    acceptAlternative(db, first.id)
    upsertPrice(db, { supplier_id: first.supplier_id!, standard_spec_id: first.standard_spec_id!, unit_cost: 3.9, source: "RFQ" })
    rematchItemById(db, item.id)
    const refreshed = listAlternativesForBom(db, bomId).find((a) => a.id === first.id)!
    expect(refreshed).toMatchObject({ unit_cost: 3.9, status: "ACCEPTED", price_source: "RFQ" })
  })

  it("cascades a BOM delete to lines, alternatives and its activity", async () => {
    const bomId = await importSample()
    deleteBom(db, bomId)
    expect(listItems(db, bomId)).toHaveLength(0)
    expect(listAlternativesForBom(db, bomId)).toHaveLength(0)
    expect(listEventsForBom(db, bomId)).toHaveLength(0)
  })
})

describe("row shape", () => {
  it("returns plain objects that can be serialised to client components", async () => {
    const bomId = await importSample()
    const [item] = listItems(db, bomId)
    expect(Object.getPrototypeOf(item)).toBe(Object.prototype)
    expect(Object.getPrototypeOf(listAlternativesForBom(db, bomId)[0])).toBe(Object.prototype)
  })
})

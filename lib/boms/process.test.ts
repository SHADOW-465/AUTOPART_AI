import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { NormalizedBomItem, RawBomRow } from "@/lib/ingestion/types"
import type { StandardsCatalog } from "@/lib/matching/types"
import {
  PDF_NO_TEXT_MESSAGE,
  processBom,
  STEP_UNSUPPORTED_MESSAGE,
  XLS_UNSUPPORTED_MESSAGE,
  type CatalogPriceOffer,
  type InsertBomItemInput,
  type InsertPartAlternativeInput,
  type ProcessBomDb,
} from "./process"

function fixtureCsvWithCustom(): ArrayBuffer {
  const raw = readFileSync(join(process.cwd(), "tests/fixtures/messy.csv"), "utf8")
  const text = `${raw.replace(/\s+$/, "")}\nA-102,CUSTOM BRACKET,,10,1.00\n`
  const bytes = new TextEncoder().encode(text)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

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
    {
      id: "din-125",
      body: "DIN",
      code: "DIN 125",
      partFamily: "flat_washer",
      canonicalKey: "DIN125",
    },
    {
      id: "is-2016",
      body: "IS",
      code: "IS 2016",
      partFamily: "flat_washer",
      canonicalKey: "IS2016",
    },
  ],
  equivalents: [
    { fromSpecId: "din-912", toSpecId: "is-1367-3", equivalence: "EQUIVALENT" },
    { fromSpecId: "din-125", toSpecId: "is-2016", equivalence: "EQUIVALENT" },
  ],
}

function createFakeDb() {
  const boms: Record<
    string,
    {
      status: string
      errorMessage: string | null
      totalOriginalCost: number | null
      totalOptimizedCost: number | null
      totalSavingsPct: number | null
    }
  > = {
    "bom-1": {
      status: "DRAFT",
      errorMessage: null,
      totalOriginalCost: null,
      totalOptimizedCost: null,
      totalSavingsPct: null,
    },
  }
  const items: (InsertBomItemInput & { id: string })[] = []
  const alts: InsertPartAlternativeInput[] = []
  const prices: Record<string, CatalogPriceOffer[]> = {
    "is-1367-3": [
      { supplierId: "s1", unitCost: 4.5, leadTimeDays: 7 },
      { supplierId: "s2", unitCost: 4.8, leadTimeDays: 10 },
      { supplierId: "s3", unitCost: 5.05, leadTimeDays: 11 },
      { supplierId: "s4", unitCost: 9, leadTimeDays: 20 },
    ],
    "is-2016": [{ supplierId: "s1", unitCost: 0.35, leadTimeDays: 7 }],
  }

  const db: ProcessBomDb = {
    async setBomStatus(bomId, _tenantId, status, extra) {
      const row = boms[bomId] ?? {
        status: "DRAFT",
        errorMessage: null,
        totalOriginalCost: null,
        totalOptimizedCost: null,
        totalSavingsPct: null,
      }
      row.status = status
      if (extra && "errorMessage" in extra) row.errorMessage = extra.errorMessage ?? null
      if (extra?.totalOriginalCost != null) row.totalOriginalCost = extra.totalOriginalCost
      if (extra?.totalOptimizedCost != null) row.totalOptimizedCost = extra.totalOptimizedCost
      if (extra?.totalSavingsPct != null) row.totalSavingsPct = extra.totalSavingsPct
      boms[bomId] = row
    },
    async loadCatalog() {
      return catalog
    },
    async loadSupplierPrices(standardSpecId) {
      return prices[standardSpecId] ?? []
    },
    async deleteBomItems(bomId) {
      const remaining = items.filter((row) => row.bomId !== bomId)
      const removedIds = new Set(items.filter((row) => row.bomId === bomId).map((row) => row.id))
      items.length = 0
      items.push(...remaining)
      const keptAlts = alts.filter((alt) => !removedIds.has(alt.bomItemId))
      alts.length = 0
      alts.push(...keptAlts)
    },
    async insertBomItem(item) {
      if (items.some((row) => row.bomId === item.bomId && row.lineNumber === item.lineNumber)) {
        throw new Error("unique violation: bom_id, line_number")
      }
      const id = `item-${items.length + 1}`
      items.push({ ...item, id })
      return { id }
    },
    async insertPartAlternative(alt) {
      alts.push(alt)
    },
  }

  return { db, boms, items, alts }
}

async function mockExtract(rows: RawBomRow[]): Promise<NormalizedBomItem[]> {
  return rows.map((row) => ({
    lineNumber: row.sourceLine,
    partNumber: row.cells["OEM P/N"] ?? "",
    partName: row.cells.Nomenclature ?? "",
    originalSpec: row.cells["Matl."] ?? "",
    quantity: Number(row.cells["Qty Req."] ?? 0),
    unitCost: row.cells.Rate ? Number(row.cells.Rate) : null,
    supplier: "",
    material: row.cells["Matl."] ?? "",
    category: "",
  }))
}

describe("processBom", () => {
  it("extracts messy.csv plus custom line, matches IS 1367, flags unknown", async () => {
    const fake = createFakeDb()
    await processBom("bom-1", "tenant-1", fixtureCsvWithCustom(), "text/csv", "messy.csv", {
      db: fake.db,
      extractItemsFromRows: mockExtract,
    })

    expect(fake.items).toHaveLength(3)
    expect(fake.boms["bom-1"]?.status).toBe("ANALYZED")

    const first = fake.items[0]!
    expect(first.matchStatus).toBe("MATCHED")
    expect(first.originalSpec).toContain("DIN 912")
    const firstAlts = fake.alts.filter((a) => a.bomItemId === first.id)
    expect(firstAlts).toHaveLength(3)
    expect(firstAlts[0]?.indianStandardCode).toBe("IS 1367 Part 3")
    expect(firstAlts.map((a) => a.supplierId)).toEqual(["s1", "s2", "s3"])

    const custom = fake.items[2]!
    expect(custom.partName).toBe("CUSTOM BRACKET")
    expect(custom.matchStatus).toBe("NEEDS_REVIEW")
    expect(fake.alts.filter((a) => a.bomItemId === custom.id)).toHaveLength(0)
  })

  it("reprocess is idempotent: one item per line_number", async () => {
    const fake = createFakeDb()
    const deps = {
      db: fake.db,
      extractItemsFromRows: mockExtract,
    }
    await processBom("bom-1", "tenant-1", fixtureCsvWithCustom(), "text/csv", "messy.csv", deps)
    await processBom("bom-1", "tenant-1", fixtureCsvWithCustom(), "text/csv", "messy.csv", deps)

    expect(fake.items).toHaveLength(3)
    const lineNumbers = fake.items.map((row) => row.lineNumber)
    expect(new Set(lineNumbers).size).toBe(lineNumbers.length)
  })

  it("fails .xls with export message", async () => {
    const fake = createFakeDb()
    await processBom("bom-1", "tenant-1", new ArrayBuffer(8), "application/vnd.ms-excel", "old.xls", {
      db: fake.db,
      extractItemsFromRows: async () => [],
    })
    expect(fake.boms["bom-1"]?.status).toBe("FAILED")
    expect(fake.boms["bom-1"]?.errorMessage).toBe(XLS_UNSUPPORTED_MESSAGE)
  })

  it("fails .step files", async () => {
    const fake = createFakeDb()
    await processBom("bom-1", "tenant-1", new ArrayBuffer(8), "application/octet-stream", "part.step", {
      db: fake.db,
      extractItemsFromRows: async () => [],
    })
    expect(fake.boms["bom-1"]?.status).toBe("FAILED")
    expect(fake.boms["bom-1"]?.errorMessage).toBe(STEP_UNSUPPORTED_MESSAGE)
  })

  it("fails PDFs with no text layer", async () => {
    const fake = createFakeDb()
    await expect(
      processBom("bom-1", "tenant-1", new ArrayBuffer(8), "application/pdf", "scan.pdf", {
        db: fake.db,
        parsePdf: async () => ({ ok: false, code: "NO_TEXT_LAYER" }),
        extractItemsFromRows: async () => [],
      }),
    ).rejects.toThrow(PDF_NO_TEXT_MESSAGE)
    expect(fake.boms["bom-1"]?.status).toBe("FAILED")
    expect(fake.boms["bom-1"]?.errorMessage).toBe(PDF_NO_TEXT_MESSAGE)
  })

  it("stores a mapped AI error instead of raw SDK JSON", async () => {
    const fake = createFakeDb()
    await expect(
      processBom("bom-1", "tenant-1", fixtureCsvWithCustom(), "text/csv", "messy.csv", {
        db: fake.db,
        extractItemsFromRows: async () => {
          throw new Error('400 {"error":{"message":"bad"}}')
        },
      }),
    ).rejects.toThrow("AI request failed.")
    expect(fake.boms["bom-1"]?.status).toBe("FAILED")
    expect(fake.boms["bom-1"]?.errorMessage).toBe("AI request failed.")
  })
})

import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"
import { parseXlsx } from "./excel"

describe("parseXlsx", () => {
  it("parses an in-memory workbook with one data row", async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("BOM")
    sheet.addRow(["Part Description", "Spec", "Qty"])
    sheet.addRow(["Hex Socket Bolt", "DIN 912 M6x20 8.8", 10])
    const buffer = await workbook.xlsx.writeBuffer()

    const rows = await parseXlsx(buffer as ArrayBuffer)

    expect(rows).toHaveLength(1)
    expect(rows[0].cells["Part Description"]).toBe("Hex Socket Bolt")
    expect(rows[0].cells.Spec).toBe("DIN 912 M6x20 8.8")
    expect(rows[0].cells.Qty).toBe("10")
  })
})

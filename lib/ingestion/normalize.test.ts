import { describe, expect, it } from "vitest"
import { parseCsv } from "./csv"
import { findStandardReference, normalizeRows, parseMoney, parseQuantity } from "./normalize"

describe("parseQuantity", () => {
  it.each([
    ["4", 4],
    ["4 nos", 4],
    ["1,000", 1000],
    ["2.5 kg", 2.5],
    ["", 1],
    ["n/a", 1],
  ])("%s → %s", (input, expected) => {
    expect(parseQuantity(input)).toBe(expected)
  })
})

describe("parseMoney", () => {
  it.each([
    ["12.50", 12.5],
    ["₹1,250.50", 1250.5],
    ["Rs. 3", 3],
    ["INR 12", 12],
    ["", null],
    ["0", null],
    ["TBD", null],
  ])("%s → %s", (input, expected) => {
    expect(parseMoney(input)).toBe(expected)
  })
})

describe("findStandardReference", () => {
  it("pulls the spec out of a description", () => {
    expect(findStandardReference("Hex bolt DIN 933 M8x25 8.8")).toBe("DIN 933 M8x25 8.8")
    expect(findStandardReference("Nut IS 1364 (Part 3) M8")).toBe("IS 1364 (Part 3) M8")
    expect(findStandardReference("Bracket, welded")).toBeNull()
  })
})

describe("normalizeRows", () => {
  it("maps synonym headers and parses values", () => {
    const rows = parseCsv(
      "Part No,Description,Specification,Qty/Veh,Unit Price (INR),Vendor,Commodity\n" +
        'A-1,Hex bolt,DIN 933 M8x25 8.8,4 nos,"₹3.80",Imported,Fasteners\n' +
        "A-2,,,2,,,\n" +
        "A-3,Flat washer,,8,0.55,,Fasteners\n",
    )
    const { items, recognized } = normalizeRows(rows)
    expect(recognized).toBe(true)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      lineNumber: 1,
      partNumber: "A-1",
      partName: "Hex bolt",
      originalSpec: "DIN 933 M8x25 8.8",
      quantity: 4,
      unitCost: 3.8,
      supplier: "Imported",
      category: "Fasteners",
    })
    expect(items[1]).toMatchObject({ lineNumber: 2, partName: "Flat washer", originalSpec: "", unitCost: 0.55 })
  })

  it("falls back to a standard reference in the description, then to the material", () => {
    const rows = parseCsv("Description,Material,Qty\nHex nut ISO 4032 M8 8,,10\nShaft,16MnCr5,1\n")
    const { items } = normalizeRows(rows)
    expect(items.map((i) => i.originalSpec)).toEqual(["ISO 4032 M8 8", "16MnCr5"])
  })

  it("reports unrecognised headers", () => {
    const rows = parseCsv("Foo,Bar\n1,2\n")
    expect(normalizeRows(rows).recognized).toBe(false)
  })
})

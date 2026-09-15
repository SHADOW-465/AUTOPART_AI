import { describe, expect, it } from "vitest"
import { mapHeader } from "./headers"

describe("mapHeader", () => {
  it.each([
    ["Part No", "part_number"],
    ["OEM P/N", "part_number"],
    ["Description", "part_name"],
    ["Nomenclature", "part_name"],
    ["Matl.", "material"],
    ["Spec", "original_spec"],
    ["Qty Req.", "quantity"],
    ["Unit Cost", "unit_cost"],
    ["Rate", "unit_cost"],
    ["Finish", null],
  ] as const)("%s → %s", (input, expected) => {
    expect(mapHeader(input)).toBe(expected)
  })
})

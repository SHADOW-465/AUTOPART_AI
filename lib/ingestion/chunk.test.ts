import { describe, expect, it } from "vitest"
import { chunkRows } from "./chunk"

describe("chunkRows", () => {
  it("splits 45 rows into chunks of 20, 20, 5", () => {
    const rows = Array.from({ length: 45 }, (_, i) => i)
    const chunks = chunkRows(rows)
    expect(chunks.map((c) => c.length)).toEqual([20, 20, 5])
  })

  it("throws if size is less than 1", () => {
    expect(() => chunkRows([1], 0)).toThrow("chunk size must be >= 1")
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { RawBomRow } from "@/lib/ingestion/types"

const create = vi.fn()

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>()
  return {
    ...actual,
    getGroqClient: () => ({
      chat: { completions: { create } },
    }),
  }
})

import { extractItemsFromRows } from "./extract"

function row(n: number): RawBomRow {
  return {
    sourceLine: n,
    cells: { part_name: `Part ${n}`, original_spec: `SPEC-${n}` },
  }
}

function completion(items: unknown[]) {
  return { choices: [{ message: { content: JSON.stringify({ items }) } }] }
}

const validItem = {
  line_number: 1,
  part_number: "PN-1",
  part_name: "Hex socket cap screw",
  original_spec: "DIN 912 M6x20 8.8",
  quantity: 10,
  unit_cost: 8.5,
  supplier: "Acme",
  material: "steel",
  category: "fastener",
}

describe("extractItemsFromRows", () => {
  beforeEach(() => {
    create.mockReset()
  })

  it("chunks 25 rows into 2 create() calls", async () => {
    create.mockResolvedValue(completion([]))
    await extractItemsFromRows(Array.from({ length: 25 }, (_, i) => row(i + 1)))
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[0][0].model).toBe("openai/gpt-oss-20b")
    expect(create.mock.calls[0][0].response_format.type).toBe("json_schema")
    expect(create.mock.calls[0][0].response_format.json_schema.strict).toBe(true)
  })

  it("drops items with empty part_name and empty original_spec", async () => {
    create.mockResolvedValue(
      completion([
        validItem,
        {
          ...validItem,
          line_number: 2,
          part_name: "  ",
          original_spec: "",
        },
      ]),
    )
    const items = await extractItemsFromRows([row(1)])
    expect(items).toHaveLength(1)
    expect(items[0]?.partName).toBe("Hex socket cap screw")
    expect(items[0]?.originalSpec).toBe("DIN 912 M6x20 8.8")
  })

  it("retries once on 429 honoring retry-after 0", async () => {
    const err = Object.assign(new Error("Too Many Requests"), {
      status: 429,
      headers: { "retry-after": "0" },
    })
    create.mockRejectedValueOnce(err).mockResolvedValueOnce(completion([validItem]))
    const items = await extractItemsFromRows([row(1)])
    expect(create).toHaveBeenCalledTimes(2)
    expect(items).toHaveLength(1)
  })

  it("maps unit_cost 0 to unitCost null", async () => {
    create.mockResolvedValue(
      completion([
        {
          ...validItem,
          unit_cost: 0,
          quantity: 0,
        },
      ]),
    )
    const items = await extractItemsFromRows([row(1)])
    expect(items).toHaveLength(1)
    expect(items[0]?.unitCost).toBeNull()
    expect(items[0]?.quantity).toBe(0)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const { getText } = vi.hoisted(() => ({
  getText: vi.fn(),
}))

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    async getText() {
      return getText()
    }
    async destroy() {
      return undefined
    }
  },
}))

import { parsePdf } from "./pdf"

describe("parsePdf", () => {
  beforeEach(() => {
    getText.mockReset()
  })

  it("returns NO_TEXT_LAYER when extracted text is empty", async () => {
    getText.mockResolvedValue({ text: "" })
    const result = await parsePdf(new ArrayBuffer(0))
    expect(result).toEqual({ ok: false, code: "NO_TEXT_LAYER" })
  })

  it("parses a comma-delimited header and one data row", async () => {
    getText.mockResolvedValue({
      text: "Part,Spec,Qty\nBolt,DIN 912 M6x20 8.8,10",
    })
    const result = await parsePdf(new ArrayBuffer(0))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].cells.Part).toBe("Bolt")
    expect(result.rows[0].cells.Spec).toBe("DIN 912 M6x20 8.8")
    expect(result.rows[0].cells.Qty).toBe("10")
  })
})

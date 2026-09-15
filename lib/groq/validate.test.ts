import { beforeEach, describe, expect, it, vi } from "vitest"

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

import { validateAlternative } from "./validate"

const report = {
  material_composition_result: "EQUIVALENT",
  mechanical_properties_result: "EQUIVALENT",
  dimensional_fit_result: "INTERCHANGEABLE",
  recommendation: "SAFE_TO_SWITCH",
  summary_markdown: "IS 1367 Part 3 is equivalent to DIN 912 for this fastener.",
}

describe("validateAlternative", () => {
  beforeEach(() => {
    create.mockReset()
  })

  it("parses 120b JSON and returns SAFE_TO_SWITCH", async () => {
    create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(report) } }],
    })
    const result = await validateAlternative({
      originalSpec: "DIN 912 M6x20 8.8",
      originalCatalog: { tensile_mpa_min: 800 },
      alternativeSpec: "IS 1367 Part 3 M6x20 8.8",
      alternativeCatalog: { tensile_mpa_min: 800 },
    })
    expect(create.mock.calls[0][0].model).toBe("openai/gpt-oss-120b")
    expect(result.recommendation).toBe("SAFE_TO_SWITCH")
    expect(result.material_composition_result).toBe("EQUIVALENT")
  })

  it("rejects invalid JSON", async () => {
    create.mockResolvedValue({
      choices: [{ message: { content: "not-json {" } }],
    })
    await expect(
      validateAlternative({
        originalSpec: "DIN 912",
        originalCatalog: {},
        alternativeSpec: "IS 1367",
        alternativeCatalog: {},
      }),
    ).rejects.toThrow()
  })
})

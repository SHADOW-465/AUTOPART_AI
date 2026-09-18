import { beforeEach, describe, expect, it, vi } from "vitest"

const requireUser = vi.hoisted(() => vi.fn())
const logAudit = vi.hoisted(() => vi.fn())
const validateAlternative = vi.hoisted(() => vi.fn())
const createServerClient = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth/session", () => ({ requireUser }))
vi.mock("@/lib/audit/log", () => ({ logAudit }))
vi.mock("@/lib/groq/validate", () => ({ validateAlternative }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))

import { runValidationAction } from "./validation"

const adminSession = {
  user: { id: "user-1" },
  profile: {
    id: "user-1",
    tenant_id: "tenant-1",
    role: "quality_manager",
    full_name: "QA",
  },
}

const report = {
  material_composition_result: "EQUIVALENT",
  mechanical_properties_result: "EQUIVALENT",
  dimensional_fit_result: "INTERCHANGEABLE",
  recommendation: "SAFE_TO_SWITCH",
  summary_markdown: "OK",
}

const alt = {
  id: "alt-1",
  bom_item_id: "item-1",
  tenant_id: "tenant-1",
  alternative_spec: "IS 1367",
  indian_standard_code: "IS 1367",
  standard_spec_id: "spec-is",
}

const item = {
  id: "item-1",
  bom_id: "bom-1",
  tenant_id: "tenant-1",
  original_spec: "DIN 912",
  canonical_spec_key: "din-912",
}

function chain(result: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {}
  const next = () => self
  self.select = next
  self.eq = next
  self.maybeSingle = async () => result
  self.insert = async () => ({ error: null })
  return self
}

describe("runValidationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUser.mockResolvedValue(adminSession)
    logAudit.mockResolvedValue(undefined)
    validateAlternative.mockResolvedValue(report)
  })

  it("maps 429 from validateAlternative", async () => {
    createServerClient.mockResolvedValue({
      from: (table: string) => {
        if (table === "part_alternatives") return chain({ data: alt, error: null })
        if (table === "bom_items") return chain({ data: item, error: null })
        if (table === "standard_specs") return chain({ data: { mechanical: { tensile_mpa_min: 800 } }, error: null })
        if (table === "technical_validations") return chain({ data: null, error: null })
        throw new Error(table)
      },
    })
    validateAlternative.mockRejectedValue(new Error("AI rate limit, wait a minute and retry."))
    const result = await runValidationAction("alt-1")
    expect(result).toEqual({ error: "AI rate limit, wait a minute and retry." })
  })

  it("maps 401 / not configured", async () => {
    createServerClient.mockResolvedValue({
      from: (table: string) => {
        if (table === "part_alternatives") return chain({ data: alt, error: null })
        if (table === "bom_items") return chain({ data: item, error: null })
        if (table === "standard_specs") return chain({ data: { mechanical: {} }, error: null })
        throw new Error(table)
      },
    })
    validateAlternative.mockRejectedValue(new Error("AI is not configured."))
    const result = await runValidationAction("alt-1")
    expect(result).toEqual({ error: "AI is not configured." })
  })

  it("inserts technical_validations and audits", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    createServerClient.mockResolvedValue({
      from: (table: string) => {
        if (table === "part_alternatives") return chain({ data: alt, error: null })
        if (table === "bom_items") return chain({ data: item, error: null })
        if (table === "standard_specs") return chain({ data: { mechanical: { tensile_mpa_min: 800 } }, error: null })
        if (table === "technical_validations") return { insert }
        throw new Error(table)
      },
    })
    const result = await runValidationAction("alt-1")
    expect(result).toEqual({ report })
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        alternative_id: "alt-1",
        ai_engine: "openai/gpt-oss-120b",
        recommendation: "SAFE_TO_SWITCH",
      }),
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "validation.ran", entityId: "alt-1" }),
    )
  })
})

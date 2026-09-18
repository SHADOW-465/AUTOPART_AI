import { beforeEach, describe, expect, it, vi } from "vitest"

const requireUser = vi.hoisted(() => vi.fn())
const logAudit = vi.hoisted(() => vi.fn())
const draftRfqEmail = vi.hoisted(() => vi.fn())
const createServerClient = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth/session", () => ({ requireUser }))
vi.mock("@/lib/audit/log", () => ({ logAudit }))
vi.mock("@/lib/groq/rfq", () => ({ draftRfqEmail }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))

import { draftRfqAction } from "./rfq"

const session = {
  user: { id: "user-1" },
  profile: {
    id: "user-1",
    tenant_id: "tenant-1",
    role: "procurement_engineer",
    full_name: "Priya",
  },
}

const alt = {
  id: "alt-1",
  bom_item_id: "item-1",
  tenant_id: "tenant-1",
  supplier_id: "sup-1",
  alternative_spec: "IS 1367 M6x20 8.8",
  alternative_unit_cost: 4.2,
}

const item = {
  id: "item-1",
  quantity_per_vehicle: 12,
}

function chain(result: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {}
  const next = () => self
  self.select = next
  self.eq = next
  self.maybeSingle = async () => result
  return self
}

describe("draftRfqAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUser.mockResolvedValue(session)
    logAudit.mockResolvedValue(undefined)
    draftRfqEmail.mockResolvedValue("Subject: RFQ")
  })

  it("returns Forbidden for quality_manager", async () => {
    requireUser.mockResolvedValue({
      user: { id: "q" },
      profile: { id: "q", tenant_id: "tenant-1", role: "quality_manager", full_name: "Q" },
    })
    const result = await draftRfqAction("alt-1")
    expect(result).toEqual({ error: "Forbidden" })
    expect(draftRfqEmail).not.toHaveBeenCalled()
  })

  it("maps 429", async () => {
    createServerClient.mockResolvedValue({
      from: (table: string) => {
        if (table === "part_alternatives") return chain({ data: alt, error: null })
        if (table === "bom_items") return chain({ data: item, error: null })
        if (table === "suppliers") return chain({ data: { legal_name: "Sundram", brand_name: "TVS" }, error: null })
        if (table === "tenants") return chain({ data: { industrial_cluster: "Chennai" }, error: null })
        throw new Error(table)
      },
    })
    draftRfqEmail.mockRejectedValue(new Error("AI rate limit, wait a minute and retry."))
    expect(await draftRfqAction("alt-1")).toEqual({
      error: "AI rate limit, wait a minute and retry.",
    })
  })

  it("maps 401", async () => {
    createServerClient.mockResolvedValue({
      from: (table: string) => {
        if (table === "part_alternatives") return chain({ data: alt, error: null })
        if (table === "bom_items") return chain({ data: item, error: null })
        if (table === "suppliers") return chain({ data: { legal_name: "Sundram" }, error: null })
        if (table === "tenants") return chain({ data: { industrial_cluster: "Chennai" }, error: null })
        throw new Error(table)
      },
    })
    draftRfqEmail.mockRejectedValue(new Error("AI is not configured."))
    expect(await draftRfqAction("alt-1")).toEqual({ error: "AI is not configured." })
  })

  it("returns email and audits rfq.drafted", async () => {
    createServerClient.mockResolvedValue({
      from: (table: string) => {
        if (table === "part_alternatives") return chain({ data: alt, error: null })
        if (table === "bom_items") return chain({ data: item, error: null })
        if (table === "suppliers") return chain({ data: { legal_name: "Sundram", brand_name: "TVS" }, error: null })
        if (table === "tenants") return chain({ data: { industrial_cluster: "Chennai" }, error: null })
        throw new Error(table)
      },
    })
    const result = await draftRfqAction("alt-1")
    expect(result).toEqual({ email: "Subject: RFQ" })
    expect(draftRfqEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        spec: "IS 1367 M6x20 8.8",
        quantity: 12,
        vendorName: "TVS",
        deliveryCluster: "Chennai",
        userName: "Priya",
        userRole: "procurement_engineer",
      }),
    )
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "rfq.drafted" }))
  })
})

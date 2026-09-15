import { beforeEach, describe, expect, it, vi } from "vitest"

const requireUser = vi.hoisted(() => vi.fn())
const insert = vi.hoisted(() => vi.fn())
const createServerClient = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth/session", () => ({ requireUser }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))

import { logAudit } from "./log"

const user = { id: "user-1" }
const profile = { tenant_id: "tenant-1" }

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUser.mockResolvedValue({ user, profile })
    createServerClient.mockResolvedValue({
      from: () => ({ insert }),
    })
  })

  it("inserts an audit event for the profile tenant", async () => {
    insert.mockResolvedValue({ error: null })
    await logAudit({
      action: "bom.uploaded",
      entityType: "bom",
      entityId: "bom-1",
      metadata: { filename: "parts.xlsx" },
    })
    expect(insert).toHaveBeenCalledWith({
      tenant_id: "tenant-1",
      actor_id: "user-1",
      action: "bom.uploaded",
      entity_type: "bom",
      entity_id: "bom-1",
      metadata: { filename: "parts.xlsx" },
    })
  })

  it("logs and swallows insert errors", async () => {
    const error = { message: "rls denied" }
    insert.mockResolvedValue({ error })
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(logAudit({ action: "invite.created", entityType: "invite" })).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith("audit_events insert failed", error)
    consoleError.mockRestore()
  })
})

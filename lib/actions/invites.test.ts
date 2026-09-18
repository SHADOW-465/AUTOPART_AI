import { beforeEach, describe, expect, it, vi } from "vitest"

const requireRole = vi.hoisted(() => vi.fn())
const logAudit = vi.hoisted(() => vi.fn())
const insert = vi.hoisted(() => vi.fn())
const single = vi.hoisted(() => vi.fn())
const maybeSingle = vi.hoisted(() => vi.fn())
const inviteUserByEmail = vi.hoisted(() => vi.fn())
const createServerClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const headersGet = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  headers: async () => ({ get: headersGet }),
}))
vi.mock("@/lib/auth/session", () => ({ requireRole }))
vi.mock("@/lib/audit/log", () => ({ logAudit }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }))

import { INVITE_INVALID_MESSAGE } from "./invite-messages"
import { createInviteAction, getInviteForToken } from "./invites"

const session = {
  user: { id: "admin-1" },
  profile: { id: "admin-1", tenant_id: "tenant-1", role: "plant_admin" },
}

describe("createInviteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRole.mockResolvedValue(session)
    logAudit.mockResolvedValue(undefined)
    headersGet.mockImplementation((name: string) => (name === "origin" ? "http://localhost:3000" : null))
    single.mockResolvedValue({ data: { id: "invite-1" }, error: null })
    insert.mockImplementation(() => ({
      select: () => ({ single }),
    }))
    createServerClient.mockResolvedValue({
      from: () => ({ insert }),
    })
    inviteUserByEmail.mockResolvedValue({ error: null })
    createAdminClient.mockReturnValue({
      auth: { admin: { inviteUserByEmail } },
    })
  })

  it("requires plant_admin and returns a copyable invite URL", async () => {
    const result = await createInviteAction("Eng@Plant.example ", "quality_manager")
    expect(requireRole).toHaveBeenCalledWith(["plant_admin"])
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-1",
        email: "eng@plant.example",
        role: "quality_manager",
        invited_by: "admin-1",
      }),
    )
    const row = insert.mock.calls[0][0] as { token: string; expires_at: string }
    expect(row.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    const ttlMs = new Date(row.expires_at).getTime() - Date.now()
    expect(ttlMs).toBeGreaterThan(71 * 60 * 60 * 1000)
    expect(ttlMs).toBeLessThanOrEqual(72 * 60 * 60 * 1000)
    expect(result).toEqual({ inviteUrl: `http://localhost:3000/invite/${row.token}` })
    expect(inviteUserByEmail).toHaveBeenCalledWith("eng@plant.example", {
      redirectTo: `http://localhost:3000/invite/${row.token}`,
    })
    expect(logAudit).toHaveBeenCalledWith({
      action: "invite.sent",
      entityType: "invite",
      entityId: "invite-1",
      metadata: { email: "eng@plant.example", role: "quality_manager" },
    })
  })

  it("still returns the URL when inviteUserByEmail is unavailable", async () => {
    createAdminClient.mockReturnValue({
      auth: { admin: {} },
    })
    const result = await createInviteAction("eng@plant.example", "quality_manager")
    expect(result).toEqual(expect.objectContaining({ inviteUrl: expect.stringMatching(/\/invite\//) }))
  })

  it("still returns the URL when inviteUserByEmail throws", async () => {
    inviteUserByEmail.mockRejectedValue(new Error("smtp down"))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const result = await createInviteAction("eng@plant.example", "quality_manager")
    expect(result).toEqual(expect.objectContaining({ inviteUrl: expect.stringMatching(/\/invite\//) }))
    consoleError.mockRestore()
  })

  it("rejects an invalid email without inserting", async () => {
    await expect(createInviteAction("not-an-email", "plant_admin")).resolves.toEqual({
      error: "Enter a valid email",
    })
    expect(insert).not.toHaveBeenCalled()
  })
})

describe("getInviteForToken", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle }),
        }),
      }),
    })
  })

  it("returns an open invite", async () => {
    const invite = {
      id: "invite-1",
      email: "a@b.com",
      accepted_at: null,
      expires_at: new Date(Date.now() + 10000).toISOString(),
    }
    maybeSingle.mockResolvedValue({ data: invite, error: null })
    await expect(getInviteForToken("token-1")).resolves.toEqual({ invite })
  })

  it("marks expired and used tokens invalid", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "invite-1",
        accepted_at: null,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      },
      error: null,
    })
    await expect(getInviteForToken("token-1")).resolves.toEqual({ invalid: true })

    maybeSingle.mockResolvedValue({
      data: {
        id: "invite-1",
        accepted_at: "2026-01-01T00:00:00Z",
        expires_at: new Date(Date.now() + 10000).toISOString(),
      },
      error: null,
    })
    await expect(getInviteForToken("token-1")).resolves.toEqual({ invalid: true })
  })

  it("exports the expired/used copy", () => {
    expect(INVITE_INVALID_MESSAGE).toBe("Ask your Plant Admin to send a new invite")
  })
})

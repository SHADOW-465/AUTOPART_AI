import { beforeEach, describe, expect, it, vi } from "vitest"

const redirect = vi.hoisted(() =>
  vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
)
const signInWithPassword = vi.hoisted(() => vi.fn())
const createUser = vi.hoisted(() => vi.fn())
const deleteUser = vi.hoisted(() => vi.fn())
const updateUserById = vi.hoisted(() => vi.fn())
const listUsers = vi.hoisted(() => vi.fn())
const invitesMaybeSingle = vi.hoisted(() => vi.fn())
const profilesInsert = vi.hoisted(() => vi.fn())
const profilesMaybeSingle = vi.hoisted(() => vi.fn())
const invitesUpdateEq = vi.hoisted(() => vi.fn())
const createServerClient = vi.hoisted(() => vi.fn())
const createAdminClient = vi.hoisted(() => vi.fn())
const logAudit = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("next/navigation", () => ({ redirect }))
vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => null }),
}))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }))
vi.mock("@/lib/audit/log", () => ({ logAudit }))
vi.mock("@/lib/auth/session", () => ({
  requireRole: vi.fn(),
  requireUser: vi.fn(),
}))

import { acceptInviteAction, loginAction } from "./auth"
import { INVITE_INVALID_MESSAGE } from "./invite-messages"

const openInvite = {
  id: "invite-1",
  tenant_id: "tenant-1",
  email: "new@example.com",
  role: "procurement_engineer",
  token: "token-1",
  invited_by: "admin-1",
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  accepted_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function mockClients() {
  createServerClient.mockResolvedValue({
    auth: { signInWithPassword },
  })
  createAdminClient.mockReturnValue({
    auth: { admin: { createUser, deleteUser, updateUserById, listUsers } },
    from: (table: string) => {
      if (table === "invites") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: invitesMaybeSingle }),
          }),
          update: (payload: unknown) => ({
            eq: (column: string, value: string) => ({
              is: () => ({
                select: () => invitesUpdateEq(payload, column, value),
              }),
            }),
          }),
        }
      }
      if (table === "profiles") {
        return {
          insert: profilesInsert,
          select: () => ({
            eq: () => ({ maybeSingle: profilesMaybeSingle }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  })
}

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClients()
  })

  it("signs in and redirects to /app", async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    await expect(loginAction("user@example.com", "secret123")).rejects.toThrow("NEXT_REDIRECT:/app")
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
    })
  })

  it("returns a generic error and does not enumerate users", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "User not found" } })
    await expect(loginAction("missing@example.com", "wrong")).resolves.toEqual({
      error: "Invalid email or password",
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it("returns the same generic error for empty credentials", async () => {
    await expect(loginAction("  ", "")).resolves.toEqual({
      error: "Invalid email or password",
    })
    expect(signInWithPassword).not.toHaveBeenCalled()
  })
})

describe("acceptInviteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClients()
    logAudit.mockResolvedValue(undefined)
    invitesMaybeSingle.mockResolvedValue({ data: openInvite, error: null })
    createUser.mockResolvedValue({ data: { user: { id: "user-new" } }, error: null })
    profilesInsert.mockResolvedValue({ error: null })
    profilesMaybeSingle.mockResolvedValue({ data: { id: "user-new" }, error: null })
    invitesUpdateEq.mockResolvedValue({ data: [{ id: "invite-1" }], error: null })
    updateUserById.mockResolvedValue({ error: null })
    listUsers.mockResolvedValue({ data: { users: [] }, error: null })
    signInWithPassword.mockResolvedValue({ error: null })
  })

  it("creates the user, profile, session, audit, and redirects", async () => {
    await expect(acceptInviteAction("token-1", "Priya Nair", "password1")).rejects.toThrow(
      "NEXT_REDIRECT:/app",
    )
    expect(createUser).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password1",
      email_confirm: true,
      user_metadata: { full_name: "Priya Nair" },
    })
    expect(profilesInsert).toHaveBeenCalledWith({
      id: "user-new",
      tenant_id: "tenant-1",
      full_name: "Priya Nair",
      role: "procurement_engineer",
    })
    expect(invitesUpdateEq).toHaveBeenCalledWith(expect.objectContaining({ accepted_at: expect.any(String) }), "id", "invite-1")
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password1",
    })
    expect(logAudit).toHaveBeenCalledWith({
      action: "invite.accepted",
      entityType: "invite",
      entityId: "invite-1",
      metadata: { email: "new@example.com", role: "procurement_engineer" },
    })
  })

  it("rejects expired invites with the spec copy", async () => {
    invitesMaybeSingle.mockResolvedValue({
      data: { ...openInvite, expires_at: new Date(Date.now() - 1000).toISOString() },
      error: null,
    })
    await expect(acceptInviteAction("token-1", "Priya Nair", "password1")).resolves.toEqual({
      error: INVITE_INVALID_MESSAGE,
    })
    expect(createUser).not.toHaveBeenCalled()
  })

  it("rejects used invites with the spec copy", async () => {
    invitesMaybeSingle.mockResolvedValue({
      data: { ...openInvite, accepted_at: "2026-01-02T00:00:00Z" },
      error: null,
    })
    await expect(acceptInviteAction("token-1", "Priya Nair", "password1")).resolves.toEqual({
      error: INVITE_INVALID_MESSAGE,
    })
    expect(createUser).not.toHaveBeenCalled()
  })

  it("deletes the auth user if profile insert fails for a newly created user", async () => {
    profilesInsert.mockResolvedValue({ error: { message: "rls" } })
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(acceptInviteAction("token-1", "Priya Nair", "password1")).resolves.toEqual({
      error: "Could not accept invite",
    })
    expect(deleteUser).toHaveBeenCalledWith("user-new")
    expect(redirect).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("resumes when createUser reports a duplicate email", async () => {
    createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "A user with this email address has already been registered", status: 422 },
    })
    listUsers.mockResolvedValue({
      data: { users: [{ id: "user-invited", email: "new@example.com" }] },
      error: null,
    })
    profilesMaybeSingle.mockResolvedValue({ data: null, error: null })
    profilesInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } })

    await expect(acceptInviteAction("token-1", "Priya Nair", "password1")).rejects.toThrow(
      "NEXT_REDIRECT:/app",
    )
    expect(updateUserById).toHaveBeenCalledWith("user-invited", {
      password: "password1",
      email_confirm: true,
      user_metadata: { full_name: "Priya Nair" },
    })
    expect(deleteUser).not.toHaveBeenCalled()
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password1",
    })
  })

  it("does not overwrite password when the email already has a profile", async () => {
    createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "A user with this email address has already been registered", status: 422 },
    })
    listUsers.mockResolvedValue({
      data: { users: [{ id: "user-existing", email: "new@example.com" }] },
      error: null,
    })
    profilesMaybeSingle.mockResolvedValue({ data: { id: "user-existing" }, error: null })

    await expect(acceptInviteAction("token-1", "Priya Nair", "password1")).resolves.toEqual({
      error: "This email already has an account. Ask your Plant Admin to send a new invite.",
    })
    expect(updateUserById).not.toHaveBeenCalled()
    expect(profilesInsert).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})

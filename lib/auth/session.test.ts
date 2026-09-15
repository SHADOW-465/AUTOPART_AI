import { beforeEach, describe, expect, it, vi } from "vitest"

const redirect = vi.hoisted(() =>
  vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
)

const getUser = vi.hoisted(() => vi.fn())
const maybeSingle = vi.hoisted(() => vi.fn())
const createServerClient = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({ redirect }))
vi.mock("@/lib/supabase/server", () => ({ createServerClient }))

import type { Profile } from "@/lib/db/types"
import { requireRole, requireUser } from "./session"

const user = { id: "user-1", email: "admin@example.com" }
const profile: Profile = {
  id: "user-1",
  tenant_id: "tenant-1",
  full_name: "Plant Admin",
  role: "plant_admin",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function mockClient(options: { user?: typeof user | null; profile?: typeof profile | null }) {
  maybeSingle.mockResolvedValue({ data: options.profile ?? null, error: null })
  getUser.mockResolvedValue({ data: { user: options.user ?? null } })
  createServerClient.mockResolvedValue({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  })
}

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns user and profile", async () => {
    mockClient({ user, profile })
    await expect(requireUser()).resolves.toEqual({ user, profile })
  })

  it("redirects to /login when there is no auth user", async () => {
    mockClient({ user: null })
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login")
  })

  it("redirects to /login when the profile is missing", async () => {
    mockClient({ user, profile: null })
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login")
  })
})

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the session when the role is allowed", async () => {
    mockClient({ user, profile })
    await expect(requireRole(["plant_admin"])).resolves.toEqual({ user, profile })
  })

  it("redirects to /forbidden when the role is not allowed", async () => {
    mockClient({ user, profile: { ...profile, role: "quality_manager" } })
    await expect(requireRole(["plant_admin"])).rejects.toThrow("NEXT_REDIRECT:/forbidden")
  })
})

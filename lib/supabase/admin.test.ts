import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const createClient = vi.hoisted(() => vi.fn())
vi.mock("@supabase/supabase-js", () => ({ createClient }))

import { createAdminClient } from "./admin"

describe("createAdminClient", () => {
  it("throws when the service role key is missing", () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    try {
      expect(() => createAdminClient()).toThrow("SUPABASE_SERVICE_ROLE_KEY is not configured")
    } finally {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
      if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
      else process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey
    }
  })

  it("uses the service role key and disables session persistence", () => {
    createClient.mockReturnValue({ auth: {} })
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role"
    try {
      createAdminClient()
      expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "service-role", {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    } finally {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
      if (prevKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
      else process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey
    }
  })
})

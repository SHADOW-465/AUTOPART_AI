import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getUser = vi.hoisted(() => vi.fn())
const createServerClient = vi.hoisted(() => vi.fn())

vi.mock("@supabase/ssr", () => ({ createServerClient }))

import { NextRequest } from "next/server"
import { updateSession } from "./middleware"

function requestFor(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"))
}

describe("updateSession", () => {
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    createServerClient.mockReturnValue({
      auth: { getUser },
    })
  })

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
    if (prevKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey
  })

  it("redirects unauthenticated users away from /app", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const response = await updateSession(requestFor("/app/boms"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:3000/login")
  })

  it("allows public routes without a session", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    for (const path of ["/", "/login", "/invite/token"]) {
      const response = await updateSession(requestFor(path))
      expect(response.status).toBe(200)
    }
  })

  it("allows authenticated access to /app", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    const response = await updateSession(requestFor("/app"))
    expect(response.status).toBe(200)
  })
})

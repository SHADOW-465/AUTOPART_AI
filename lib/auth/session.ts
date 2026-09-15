import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import type { Role } from "@/lib/auth/roles"
import type { Profile } from "@/lib/db/types"
import { createServerClient } from "@/lib/supabase/server"

export async function requireUser(): Promise<{ user: User; profile: Profile }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

  if (!profile) {
    redirect("/login")
  }

  return { user, profile: profile as Profile }
}

export async function requireRole(roles: Role[]): Promise<{ user: User; profile: Profile }> {
  const session = await requireUser()
  if (!roles.includes(session.profile.role)) {
    redirect("/forbidden")
  }
  return session
}

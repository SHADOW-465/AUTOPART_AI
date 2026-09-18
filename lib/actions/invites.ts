"use server"

import { headers } from "next/headers"
import { requireRole } from "@/lib/auth/session"
import { type Role } from "@/lib/auth/roles"
import { logAudit } from "@/lib/audit/log"
import type { Invite } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@/lib/supabase/server"

const ROLES: Role[] = ["plant_admin", "procurement_engineer", "quality_manager"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITE_TTL_MS = 72 * 60 * 60 * 1000

export async function createInviteAction(
  email: string,
  role: Role,
): Promise<{ inviteUrl: string } | { error: string }> {
  const { user, profile } = await requireRole(["plant_admin"])
  const normalizedEmail = email.trim().toLowerCase()

  if (!EMAIL_RE.test(normalizedEmail)) {
    return { error: "Enter a valid email" }
  }
  if (!ROLES.includes(role)) {
    return { error: "Select a valid role" }
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString()
  const supabase = await createServerClient()
  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      tenant_id: profile.tenant_id,
      email: normalizedEmail,
      role,
      token,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single()

  if (error || !invite) {
    console.error("invite insert failed", error)
    return { error: "Could not create invite" }
  }

  const inviteUrl = `${await resolveOrigin()}/invite/${token}`

  try {
    const admin = createAdminClient()
    const inviteByEmail = admin.auth.admin.inviteUserByEmail
    if (typeof inviteByEmail === "function") {
      const result = await inviteByEmail(normalizedEmail, { redirectTo: inviteUrl })
      if (result?.error) {
        console.error("inviteUserByEmail failed", result.error)
      }
    }
  } catch (err) {
    console.error("inviteUserByEmail failed", err)
  }

  await logAudit({
    action: "invite.sent",
    entityType: "invite",
    entityId: invite.id,
    metadata: { email: normalizedEmail, role },
  })

  return { inviteUrl }
}

export async function getInviteForToken(
  token: string,
): Promise<{ invite: Invite } | { invalid: true }> {
  if (!token.trim()) {
    return { invalid: true }
  }

  const admin = createAdminClient()
  const { data: invite, error } = await admin.from("invites").select("*").eq("token", token).maybeSingle()

  if (error || !invite) {
    return { invalid: true }
  }

  const row = invite as Invite
  if (row.accepted_at !== null || new Date(row.expires_at).getTime() <= Date.now()) {
    return { invalid: true }
  }

  return { invite: row }
}

async function resolveOrigin(): Promise<string> {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  if (origin) {
    return origin.replace(/\/$/, "")
  }
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const proto = headerStore.get("x-forwarded-proto") ?? "http"
  if (host) {
    return `${proto}://${host}`
  }
  return ""
}

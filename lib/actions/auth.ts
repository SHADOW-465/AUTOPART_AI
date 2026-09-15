"use server"

import { redirect } from "next/navigation"
import { logAudit } from "@/lib/audit/log"
import type { Invite } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@/lib/supabase/server"
import { INVITE_INVALID_MESSAGE } from "@/lib/actions/invites"

const LOGIN_ERROR = "Invalid email or password"
const MIN_PASSWORD_LENGTH = 8

export async function loginAction(
  email: string,
  password: string,
): Promise<{ error: string } | void> {
  const trimmedEmail = email.trim()
  if (!trimmedEmail || !password) {
    return { error: LOGIN_ERROR }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  })

  if (error) {
    return { error: LOGIN_ERROR }
  }

  redirect("/app")
}

export async function acceptInviteAction(
  token: string,
  fullName: string,
  password: string,
): Promise<{ error: string } | void> {
  const trimmedName = fullName.trim()
  if (!token.trim()) {
    return { error: INVITE_INVALID_MESSAGE }
  }
  if (!trimmedName) {
    return { error: "Enter your full name" }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }

  const admin = createAdminClient()
  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .maybeSingle()

  if (inviteError || !invite || !isOpenInvite(invite as Invite)) {
    return { error: INVITE_INVALID_MESSAGE }
  }

  const openInvite = invite as Invite
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: openInvite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: trimmedName },
  })

  const userId = created?.user?.id
  if (createError || !userId) {
    console.error("invite createUser failed", createError)
    return { error: "Could not accept invite" }
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: openInvite.tenant_id,
    full_name: trimmedName,
    role: openInvite.role,
  })

  if (profileError) {
    console.error("invite profile insert failed", profileError)
    await admin.auth.admin.deleteUser(userId)
    return { error: "Could not accept invite" }
  }

  const { error: acceptError } = await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", openInvite.id)

  if (acceptError) {
    console.error("invite accepted_at update failed", acceptError)
    return { error: "Could not accept invite" }
  }

  const supabase = await createServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: openInvite.email,
    password,
  })

  if (signInError) {
    console.error("invite signIn failed", signInError)
    return { error: LOGIN_ERROR }
  }

  await logAudit({
    action: "invite.accepted",
    entityType: "invite",
    entityId: openInvite.id,
    metadata: { email: openInvite.email, role: openInvite.role },
  })

  redirect("/app")
}

function isOpenInvite(invite: Invite): boolean {
  return invite.accepted_at === null && new Date(invite.expires_at).getTime() > Date.now()
}

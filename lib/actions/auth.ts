"use server"

import { redirect } from "next/navigation"
import { logAudit } from "@/lib/audit/log"
import type { Invite } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@/lib/supabase/server"
import { INVITE_INVALID_MESSAGE } from "@/lib/actions/invite-messages"

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
  const userMeta = { full_name: trimmedName }
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: openInvite.email,
    password,
    email_confirm: true,
    user_metadata: userMeta,
  })

  let userId = created?.user?.id
  let createdNewAuthUser = Boolean(userId) && !createError

  if (createError || !userId) {
    if (!isDuplicateEmailError(createError)) {
      console.error("invite createUser failed", createError)
      return { error: "Could not accept invite" }
    }

    const existingId = await findAuthUserIdByEmail(admin, openInvite.email)
    if (!existingId) {
      console.error("invite duplicate email but user not found", createError)
      return { error: "Could not accept invite" }
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      user_metadata: userMeta,
    })
    if (updateError) {
      console.error("invite updateUserById failed", updateError)
      return { error: "Could not accept invite" }
    }
    userId = existingId
    createdNewAuthUser = false
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: openInvite.tenant_id,
    full_name: trimmedName,
    role: openInvite.role,
  })

  if (profileError && !isDuplicateProfileError(profileError)) {
    console.error("invite profile insert failed", profileError)
    if (createdNewAuthUser) {
      await admin.auth.admin.deleteUser(userId)
    }
    return { error: "Could not accept invite" }
  }

  const { data: acceptedRows, error: acceptError } = await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", openInvite.id)
    .is("accepted_at", null)
    .select("id")

  if (acceptError) {
    console.error("invite accepted_at update failed", acceptError)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()
    if (!existingProfile) {
      return { error: "Could not accept invite" }
    }
  } else if (!acceptedRows?.length) {
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()
    if (!existingProfile) {
      return { error: INVITE_INVALID_MESSAGE }
    }
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

function isDuplicateEmailError(error: { message?: string; code?: string; status?: number } | null): boolean {
  const message = (error?.message ?? "").toLowerCase()
  const code = (error?.code ?? "").toLowerCase()
  return (
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists") ||
    message.includes("duplicate") ||
    code.includes("already") ||
    code === "email_exists" ||
    error?.status === 422
  )
}

function isDuplicateProfileError(error: { message?: string; code?: string }): boolean {
  const message = (error.message ?? "").toLowerCase()
  const code = (error.code ?? "").toLowerCase()
  return code === "23505" || message.includes("duplicate") || message.includes("unique")
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | undefined> {
  const listUsers = admin.auth.admin.listUsers
  if (typeof listUsers !== "function") {
    return undefined
  }

  const normalized = email.toLowerCase()
  const pageSize = 200
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await listUsers({ page, perPage: pageSize })
    if (error) {
      console.error("invite listUsers failed", error)
      return undefined
    }
    const match = data?.users?.find((user) => user.email?.toLowerCase() === normalized)
    if (match?.id) {
      return match.id
    }
    if (!data?.users?.length || data.users.length < pageSize) {
      break
    }
  }
  return undefined
}

import { requireUser } from "@/lib/auth/session"
import { createServerClient } from "@/lib/supabase/server"

export async function logAudit(input: {
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { user, profile } = await requireUser()
  const supabase = await createServerClient()

  try {
    const { error } = await supabase.from("audit_events").insert({
      tenant_id: profile.tenant_id,
      actor_id: user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    })
    if (error) {
      console.error("audit_events insert failed", error)
    }
  } catch (error) {
    console.error("audit_events insert failed", error)
  }
}

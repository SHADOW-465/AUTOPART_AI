import { AuthCard } from "@/components/seion/auth-card"
import { INVITE_INVALID_MESSAGE } from "@/lib/actions/invite-messages"
import { getInviteForToken } from "@/lib/actions/invites"
import { roleLabel } from "@/lib/auth/roles"
import { InviteForm } from "./invite-form"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await getInviteForToken(token)

  return (
    <AuthCard>
      {"invalid" in result ? (
        <>
          <h1 className="mb-2 text-2xl font-bold text-brand-text-primary">Invite unavailable</h1>
          <p className="text-sm text-brand-text-secondary">{INVITE_INVALID_MESSAGE}</p>
        </>
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-bold text-brand-text-primary">Accept invite</h1>
          <p className="mb-6 text-sm text-brand-text-secondary">
            Set your password to join as {roleLabel(result.invite.role).toLowerCase()}.
          </p>
          <InviteForm token={token} email={result.invite.email} />
        </>
      )}
    </AuthCard>
  )
}

import { LucideIcon } from "@/components/lucide-icon"
import { getInviteForToken, INVITE_INVALID_MESSAGE } from "@/lib/actions/invites"
import { InviteForm } from "./invite-form"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await getInviteForToken(token)

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-brand-dark font-sans">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-brand-blue/20 to-brand-dark" />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-brand-border bg-white p-8 shadow-bevel">
          <div className="mb-8 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-gray-200 to-gray-400 p-1.5">
              <LucideIcon name="zap" size={20} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-brand-text-primary">SEION</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">AutoPart AI</p>
            </div>
          </div>
          {"invalid" in result ? (
            <div>
              <h1 className="mb-2 text-2xl font-bold text-brand-text-primary">Invite unavailable</h1>
              <p className="text-sm text-brand-text-secondary">{INVITE_INVALID_MESSAGE}</p>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-2xl font-bold text-brand-text-primary">Accept invite</h1>
              <p className="mb-6 text-sm text-brand-text-secondary">
                Set your password to join as {roleLabel(result.invite.role)}.
              </p>
              <InviteForm token={token} email={result.invite.email} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function roleLabel(role: string): string {
  if (role === "plant_admin") return "Plant Admin"
  if (role === "procurement_engineer") return "Procurement Engineer"
  if (role === "quality_manager") return "Quality Manager"
  return role
}

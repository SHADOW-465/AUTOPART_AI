import { AppShell } from "@/components/seion/app-shell"
import { canInvite } from "@/lib/auth/roles"
import { requireUser } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export default async function AuthedAppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser()
  const fullName = profile.full_name?.trim() || "User"

  return (
    <AppShell fullName={fullName} role={profile.role} showUsers={canInvite(profile.role)}>
      {children}
    </AppShell>
  )
}

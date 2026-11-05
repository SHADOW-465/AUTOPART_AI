import { InviteForm } from "@/components/seion/invite-form"
import { roleLabel } from "@/lib/auth/roles"
import { requireRole } from "@/lib/auth/session"
import { createServerClient } from "@/lib/supabase/server"

export default async function UsersSettingsPage() {
  const { profile } = await requireRole(["plant_admin"])
  const supabase = await createServerClient()

  const [{ data: invites }, { data: profiles }] = await Promise.all([
    supabase
      .from("invites")
      .select("id, email, role, expires_at, created_at")
      .eq("tenant_id", profile.tenant_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, role, is_active, created_at")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: true }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-primary">Users</h1>
        <p className="text-sm text-brand-text-secondary">Invite plant staff and review who already has access.</p>
      </div>

      <section className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <h2 className="mb-4 text-sm font-semibold text-brand-text-primary">Send invite</h2>
        <InviteForm />
      </section>

      <section className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <h2 className="mb-4 text-sm font-semibold text-brand-text-primary">Pending invites</h2>
        {invites && invites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-text-secondary">
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-brand-border last:border-0">
                    <td className="py-2 pr-4 text-brand-text-primary">{invite.email}</td>
                    <td className="py-2 pr-4 text-brand-text-secondary">{roleLabel(String(invite.role))}</td>
                    <td className="py-2 text-brand-text-secondary">
                      {new Date(String(invite.expires_at)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-brand-text-secondary">No pending invites.</p>
        )}
      </section>

      <section className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <h2 className="mb-4 text-sm font-semibold text-brand-text-primary">Plant members</h2>
        {profiles && profiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-text-secondary">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((member) => (
                  <tr key={member.id} className="border-b border-brand-border last:border-0">
                    <td className="py-2 pr-4 text-brand-text-primary">{member.full_name ?? "—"}</td>
                    <td className="py-2 pr-4 text-brand-text-secondary">{roleLabel(String(member.role))}</td>
                    <td className="py-2 text-brand-text-secondary">{member.is_active ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-brand-text-secondary">No members yet.</p>
        )}
      </section>
    </div>
  )
}

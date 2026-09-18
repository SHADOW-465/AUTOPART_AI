import { requireUser } from "@/lib/auth/session"
import { createServerClient } from "@/lib/supabase/server"

type SpecRef = { body?: string; code?: string } | { body?: string; code?: string }[] | null

function specLabel(value: SpecRef): string {
  const row = Array.isArray(value) ? value[0] : value
  if (!row?.body && !row?.code) return "—"
  return `${row.body ?? ""} ${row.code ?? ""}`.trim()
}

export default async function StandardsLibraryPage() {
  await requireUser()
  const supabase = await createServerClient()
  const { data: rows } = await supabase
    .from("standard_equivalents")
    .select(
      "id, equivalence, notes, from_spec:standard_specs!from_spec_id(body, code), to_spec:standard_specs!to_spec_id(body, code)",
    )
    .order("created_at", { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-primary">Standards library</h1>
        <p className="text-sm text-brand-text-secondary">Seeded equivalents used when matching BOM specs to IS codes.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brand-border text-brand-text-secondary">
              <th className="py-2 pr-4 font-medium">From</th>
              <th className="py-2 pr-4 font-medium">To</th>
              <th className="py-2 pr-4 font-medium">Equivalence</th>
              <th className="py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row) => (
              <tr key={row.id} className="border-b border-brand-border last:border-0">
                <td className="py-2 pr-4 font-medium text-brand-text-primary">{specLabel(row.from_spec as SpecRef)}</td>
                <td className="py-2 pr-4 text-brand-text-primary">{specLabel(row.to_spec as SpecRef)}</td>
                <td className="py-2 pr-4 text-brand-text-secondary">{String(row.equivalence)}</td>
                <td className="py-2 text-brand-text-secondary">{row.notes ? String(row.notes) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows?.length ? <p className="pt-4 text-sm text-brand-text-secondary">No equivalents seeded.</p> : null}
      </div>
    </div>
  )
}

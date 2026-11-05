import Link from "next/link"
import { RetryBomButton } from "@/components/seion/retry-bom-button"
import { BomStatusBadge } from "@/components/seion/status-badge"
import { requireUser } from "@/lib/auth/session"
import type { Bom } from "@/lib/db/types"
import { createServerClient } from "@/lib/supabase/server"

export default async function BomsPage() {
  const { profile } = await requireUser()
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("boms")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false })

  const boms = (data ?? []) as Bom[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-primary">BOMs</h1>
        <p className="text-sm text-brand-text-secondary">All BOMs uploaded by this plant, newest first.</p>
      </div>
      {boms.length === 0 ? (
        <div className="rounded-xl border border-brand-border bg-white p-8 text-center shadow-bevel">
          <p className="text-sm text-brand-text-secondary">No BOMs yet.</p>
          <Link href="/app" className="mt-3 inline-block text-sm font-semibold text-brand-blue">
            Upload a BOM
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {boms.map((bom) => (
            <li key={bom.id} className="rounded-xl border border-brand-border bg-white p-4 shadow-bevel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={`/app/boms/${bom.id}`} className="min-w-0">
                  <p className="font-semibold text-brand-text-primary">{bom.bom_code}</p>
                  <p className="truncate text-sm text-brand-text-secondary">{bom.title}</p>
                </Link>
                <BomStatusBadge status={bom.status} />
              </div>
              {bom.status === "FAILED" ? (
                <div className="mt-2">
                  <p className="text-sm text-brand-red">{snippet(bom.error_message)}</p>
                  <RetryBomButton bomId={bom.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function snippet(message: string | null): string {
  if (!message) return "Processing failed"
  return message.length > 160 ? `${message.slice(0, 157)}…` : message
}

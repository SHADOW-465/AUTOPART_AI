import { notFound } from "next/navigation"
import { BomDetail } from "@/components/seion/bom-detail"
import { formatInr } from "@/components/seion/bom-table"
import { canAccept } from "@/lib/auth/roles"
import { requireUser } from "@/lib/auth/session"
import type { Bom, BomItem, PartAlternative } from "@/lib/db/types"
import { createServerClient } from "@/lib/supabase/server"

export default async function BomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await requireUser()
  const supabase = await createServerClient()

  const { data: bom } = await supabase
    .from("boms")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle()

  if (!bom) notFound()
  const record = bom as Bom

  const { data: items } = await supabase
    .from("bom_items")
    .select("*")
    .eq("bom_id", id)
    .eq("tenant_id", profile.tenant_id)
    .order("line_number", { ascending: true })

  const itemRows = (items ?? []) as BomItem[]
  const itemIds = itemRows.map((row) => row.id)

  let alternatives: PartAlternative[] = []
  if (itemIds.length > 0) {
    const { data: alts } = await supabase
      .from("part_alternatives")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .in("bom_item_id", itemIds)
      .order("rank_order", { ascending: true })
    alternatives = (alts ?? []) as PartAlternative[]
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-text-secondary">
              {record.bom_code}
            </p>
            <h1 className="text-2xl font-bold text-brand-text-primary">{record.title}</h1>
          </div>
          <span className="rounded bg-gray-50 px-2 py-1 text-xs font-bold uppercase text-brand-text-secondary">
            {record.status}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-brand-text-secondary">Original</dt>
            <dd className="text-lg font-semibold">{formatMoney(record.total_original_cost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-brand-text-secondary">Optimized</dt>
            <dd className="text-lg font-semibold">{formatMoney(record.total_optimized_cost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-brand-text-secondary">Savings</dt>
            <dd className="text-lg font-semibold text-brand-green">
              {record.total_savings_pct == null ? "—" : `${record.total_savings_pct.toFixed(1)}%`}
            </dd>
          </div>
        </dl>
        {record.status === "FAILED" && record.error_message ? (
          <p className="mt-3 text-sm text-brand-red">{record.error_message}</p>
        ) : null}
      </header>
      <BomDetail
        items={itemRows}
        alternatives={alternatives}
        canAccept={canAccept(profile.role)}
      />
    </div>
  )
}

function formatMoney(value: number | null): string {
  if (value == null) return "—"
  return formatInr(value)
}

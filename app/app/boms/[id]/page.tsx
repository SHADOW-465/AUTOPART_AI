import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"
import { BomDetail } from "@/components/seion/bom-detail"
import { formatInr } from "@/components/seion/bom-table"
import { BomStatusBadge } from "@/components/seion/status-badge"
import { canAccept, canDraftRfq, canValidate } from "@/lib/auth/roles"
import { requireUser } from "@/lib/auth/session"
import { loadBomDetail } from "@/lib/boms/load"
import { createServerClient } from "@/lib/supabase/server"

export default async function BomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await requireUser()
  const supabase = await createServerClient()
  const detail = await loadBomDetail(supabase, profile.tenant_id, id)
  if (!detail) notFound()

  const { bom, items, alternatives, validationsByAlt } = detail
  const needsReview = items.filter((item) => item.match_status === "NEEDS_REVIEW").length

  return (
    <div className="space-y-6">
      <Link href="/app/boms" className="inline-flex items-center gap-1 text-sm font-medium text-brand-text-secondary hover:text-brand-text-primary">
        <ArrowLeft className="h-4 w-4" /> All BOMs
      </Link>
      <header className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-text-secondary">{bom.bom_code}</p>
            <h1 className="text-2xl font-bold text-brand-text-primary">{bom.title}</h1>
            {bom.source_filename ? (
              <p className="mt-1 truncate text-xs text-brand-text-secondary">Source: {bom.source_filename}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <BomStatusBadge status={bom.status} />
            {items.length > 0 ? (
              <a
                href={`/app/boms/${bom.id}/export`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-3 py-1.5 text-sm font-semibold text-brand-text-primary hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> Export proposal (CSV)
              </a>
            ) : null}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Line items" value={String(items.length)} />
          <Stat label="Needs review" value={String(needsReview)} />
          <Stat label="Original cost / vehicle" value={formatMoney(bom.total_original_cost)} />
          <Stat
            label="With accepted alternatives"
            value={
              bom.total_optimized_cost == null
                ? "—"
                : `${formatInr(bom.total_optimized_cost)}${bom.total_savings_pct == null ? "" : ` (−${bom.total_savings_pct.toFixed(1)}%)`}`
            }
            highlight
          />
        </dl>
        {bom.status === "FAILED" && bom.error_message ? (
          <p className="mt-3 text-sm text-brand-red">{bom.error_message}</p>
        ) : null}
      </header>
      <BomDetail
        items={items}
        alternatives={alternatives}
        validationsByAlt={validationsByAlt}
        canAccept={canAccept(profile.role)}
        canValidate={canValidate(profile.role)}
        canDraftRfq={canDraftRfq(profile.role)}
      />
    </div>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-brand-text-secondary">{label}</dt>
      <dd className={highlight ? "text-lg font-semibold text-brand-green" : "text-lg font-semibold text-brand-text-primary"}>
        {value}
      </dd>
    </div>
  )
}

function formatMoney(value: number | null): string {
  return value == null ? "—" : formatInr(value)
}

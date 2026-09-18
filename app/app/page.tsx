import Link from "next/link"
import { UploadDropzone } from "@/components/seion/upload-dropzone"
import { requireUser } from "@/lib/auth/session"
import { computeKpis, formatInr, type KpiAcceptedAlt } from "@/lib/boms/kpis"
import type { Bom } from "@/lib/db/types"
import { createServerClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const { profile } = await requireUser()
  const supabase = await createServerClient()

  const [{ data: bomRows }, { data: altRows }] = await Promise.all([
    supabase.from("boms").select("*").eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false }),
    supabase
      .from("part_alternatives")
      .select("is_ais_compliant, updated_at, alternative_unit_cost, bom_items(quantity_per_vehicle, current_unit_cost)")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "ACCEPTED"),
  ])

  const boms = (bomRows ?? []) as Bom[]
  const acceptedAlts = (altRows ?? []).map(mapAcceptedAlt)
  const kpis = computeKpis(
    boms.map((b) => ({ id: b.id })),
    acceptedAlts,
  )
  const recent = boms.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Monthly savings" value={formatInr(kpis.monthlySavings)} />
        <KpiCard label="BOMs processed" value={String(kpis.bomsProcessed)} />
        <KpiCard label="Compliance rate" value={`${Math.round(kpis.complianceRate * 100)}%`} />
        <KpiCard label="Accepted alternatives" value={kpis.empty ? "None" : String(acceptedAlts.length)} />
      </div>
      <UploadDropzone />
      <div>
        <h2 className="mb-3 text-lg font-bold text-brand-text-primary">Recent BOMs</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-brand-text-secondary">No BOMs yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((bom) => (
              <li key={bom.id}>
                <Link
                  href={`/app/boms/${bom.id}`}
                  className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-4 shadow-bevel"
                >
                  <span className="font-semibold text-brand-text-primary">{bom.bom_code}</span>
                  <span className="text-sm text-brand-text-secondary">{bom.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function mapAcceptedAlt(row: Record<string, unknown>): KpiAcceptedAlt {
  const item = unwrapItem(row.bom_items)
  return {
    is_ais_compliant: Boolean(row.is_ais_compliant),
    updated_at: String(row.updated_at ?? ""),
    alternative_unit_cost: numOrNull(row.alternative_unit_cost),
    quantity: Number(item?.quantity_per_vehicle ?? 0),
    current_unit_cost: numOrNull(item?.current_unit_cost),
  }
}

function unwrapItem(value: unknown): { quantity_per_vehicle?: number; current_unit_cost?: number | null } | null {
  if (!value) return null
  if (Array.isArray(value)) return (value[0] as { quantity_per_vehicle?: number; current_unit_cost?: number | null }) ?? null
  return value as { quantity_per_vehicle?: number; current_unit_cost?: number | null }
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
      <p className="text-sm text-brand-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand-text-primary">{value}</p>
    </div>
  )
}

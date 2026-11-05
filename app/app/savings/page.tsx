import { SavingsCharts } from "@/components/seion/savings-charts"
import { requireUser } from "@/lib/auth/session"
import {
  computeKpis,
  formatInr,
  savingsByCategory,
  savingsByMonth,
  type KpiAcceptedAlt,
} from "@/lib/boms/kpis"
import { createServerClient } from "@/lib/supabase/server"

export default async function SavingsPage() {
  const { profile } = await requireUser()
  const supabase = await createServerClient()

  const { data: altRows } = await supabase
    .from("part_alternatives")
    .select(
      "is_ais_compliant, updated_at, alternative_unit_cost, bom_items(quantity_per_vehicle, current_unit_cost, category)",
    )
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "ACCEPTED")

  const acceptedAlts: KpiAcceptedAlt[] = (altRows ?? []).map((row) => {
    const item = unwrapItem(row.bom_items)
    return {
      is_ais_compliant: Boolean(row.is_ais_compliant),
      updated_at: String(row.updated_at ?? ""),
      alternative_unit_cost: numOrNull(row.alternative_unit_cost),
      quantity: Number(item?.quantity_per_vehicle ?? 0),
      current_unit_cost: numOrNull(item?.current_unit_cost),
      category: item?.category ?? null,
    }
  })

  const kpis = computeKpis([], acceptedAlts)

  if (kpis.empty) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-brand-text-primary">Savings</h1>
        <div className="rounded-xl border border-brand-border bg-white p-8 text-center shadow-bevel">
          <p className="text-sm text-brand-text-secondary">Accept alternatives on a BOM to see savings here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text-primary">Savings</h1>
        <p className="text-sm text-brand-text-secondary">
          Per-vehicle savings from alternatives this plant has accepted. Savings are realised only after customer approval.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
          <p className="text-sm text-brand-text-secondary">Per-vehicle savings accepted this month</p>
          <p className="mt-2 text-2xl font-bold text-brand-text-primary">{formatInr(kpis.monthlySavings)}</p>
        </div>
        <div className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
          <p className="text-sm text-brand-text-secondary">AIS-compliant share of accepted</p>
          <p className="mt-2 text-2xl font-bold text-brand-text-primary">{Math.round(kpis.complianceRate * 100)}%</p>
        </div>
      </div>
      <SavingsCharts monthly={savingsByMonth(acceptedAlts)} byCategory={savingsByCategory(acceptedAlts)} />
    </div>
  )
}

function unwrapItem(
  value: unknown,
): { quantity_per_vehicle?: number; current_unit_cost?: number | null; category?: string | null } | null {
  if (!value) return null
  if (Array.isArray(value)) {
    return (
      (value[0] as {
        quantity_per_vehicle?: number
        current_unit_cost?: number | null
        category?: string | null
      }) ?? null
    )
  }
  return value as { quantity_per_vehicle?: number; current_unit_cost?: number | null; category?: string | null }
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

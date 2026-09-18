export type KpiBom = { id: string }

export type KpiAcceptedAlt = {
  is_ais_compliant: boolean
  updated_at: string
  alternative_unit_cost: number | null
  quantity: number
  current_unit_cost: number | null
  category?: string | null
}

export function lineSavings(alt: KpiAcceptedAlt): number {
  if (alt.current_unit_cost == null || alt.alternative_unit_cost == null) return 0
  return (alt.current_unit_cost - alt.alternative_unit_cost) * alt.quantity
}

export function computeKpis(
  boms: KpiBom[],
  acceptedAlts: KpiAcceptedAlt[],
  now: Date = new Date(),
): {
  monthlySavings: number
  bomsProcessed: number
  complianceRate: number
  empty: boolean
} {
  const empty = acceptedAlts.length === 0
  const aisCount = acceptedAlts.filter((a) => a.is_ais_compliant).length
  const complianceRate = empty ? 0 : aisCount / acceptedAlts.length

  const year = now.getFullYear()
  const month = now.getMonth()
  let monthlySavings = 0
  for (const alt of acceptedAlts) {
    const d = new Date(alt.updated_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      monthlySavings += lineSavings(alt)
    }
  }

  return {
    monthlySavings,
    bomsProcessed: boms.length,
    complianceRate,
    empty,
  }
}

export function savingsByMonth(acceptedAlts: KpiAcceptedAlt[]): { name: string; savings: number }[] {
  const map = new Map<string, number>()
  for (const alt of acceptedAlts) {
    const d = new Date(alt.updated_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    map.set(key, (map.get(key) ?? 0) + lineSavings(alt))
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, savings]) => ({ name, savings }))
}

export function savingsByCategory(acceptedAlts: KpiAcceptedAlt[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const alt of acceptedAlts) {
    const name = alt.category?.trim() || "Uncategorized"
    map.set(name, (map.get(name) ?? 0) + lineSavings(alt))
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function formatInr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

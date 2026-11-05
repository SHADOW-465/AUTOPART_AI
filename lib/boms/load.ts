import type { Bom, BomItem, PartAlternative, TechnicalValidation } from "@/lib/db/types"
import type { createServerClient } from "@/lib/supabase/server"

type Client = Awaited<ReturnType<typeof createServerClient>>

export type BomDetailData = {
  bom: Bom
  items: BomItem[]
  alternatives: PartAlternative[]
  validationsByAlt: Record<string, TechnicalValidation>
}

/** Loads one BOM with its line items, alternatives and latest validation per alternative. */
export async function loadBomDetail(
  supabase: Client,
  tenantId: string,
  bomId: string,
): Promise<BomDetailData | null> {
  const { data: bom } = await supabase
    .from("boms")
    .select("*")
    .eq("id", bomId)
    .eq("tenant_id", tenantId)
    .maybeSingle()
  if (!bom) return null

  const { data: itemRows } = await supabase
    .from("bom_items")
    .select("*")
    .eq("bom_id", bomId)
    .eq("tenant_id", tenantId)
    .order("line_number", { ascending: true })
  const items = (itemRows ?? []) as BomItem[]

  let alternatives: PartAlternative[] = []
  if (items.length > 0) {
    const { data: alts } = await supabase
      .from("part_alternatives")
      .select("*")
      .eq("tenant_id", tenantId)
      .in(
        "bom_item_id",
        items.map((row) => row.id),
      )
      .order("rank_order", { ascending: true })
    alternatives = (alts ?? []) as PartAlternative[]
  }

  const validationsByAlt: Record<string, TechnicalValidation> = {}
  if (alternatives.length > 0) {
    const { data: vals } = await supabase
      .from("technical_validations")
      .select("*")
      .eq("tenant_id", tenantId)
      .in(
        "alternative_id",
        alternatives.map((a) => a.id),
      )
      .order("validated_at", { ascending: false })
    for (const row of (vals ?? []) as TechnicalValidation[]) {
      if (!validationsByAlt[row.alternative_id]) validationsByAlt[row.alternative_id] = row
    }
  }

  return { bom: bom as Bom, items, alternatives, validationsByAlt }
}

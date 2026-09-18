"use server"

import { logAudit } from "@/lib/audit/log"
import { canDraftRfq } from "@/lib/auth/roles"
import { requireUser } from "@/lib/auth/session"
import type { BomItem, PartAlternative, Supplier, Tenant } from "@/lib/db/types"
import { draftRfqEmail } from "@/lib/groq/rfq"
import { createServerClient } from "@/lib/supabase/server"
import { mapAiActionError } from "@/lib/actions/ai-errors"

export async function draftRfqAction(
  alternativeId: string,
): Promise<{ email: string } | { error: string }> {
  const { profile } = await requireUser()
  if (!canDraftRfq(profile.role)) {
    return { error: "Forbidden" }
  }

  const supabase = await createServerClient()
  const { data: alt, error: altError } = await supabase
    .from("part_alternatives")
    .select("*")
    .eq("id", alternativeId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle()

  if (altError || !alt) {
    return { error: "Alternative not found" }
  }

  const alternative = alt as PartAlternative
  const { data: item, error: itemError } = await supabase
    .from("bom_items")
    .select("*")
    .eq("id", alternative.bom_item_id)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle()

  if (itemError || !item) {
    return { error: "BOM item not found" }
  }

  const bomItem = item as BomItem
  let vendorName = "Supplier"
  if (alternative.supplier_id) {
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", alternative.supplier_id)
      .maybeSingle()
    if (supplier) {
      const row = supplier as Supplier
      vendorName = row.brand_name || row.legal_name
    }
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .maybeSingle()

  const cluster = (tenant as Tenant | null)?.industrial_cluster ?? "not specified"

  let email: string
  try {
    email = await draftRfqEmail({
      spec: alternative.alternative_spec,
      quantity: Number(bomItem.quantity_per_vehicle),
      vendorName,
      targetPrice: alternative.alternative_unit_cost,
      deliveryCluster: cluster,
      userName: profile.full_name ?? "SEION user",
      userRole: profile.role,
    })
  } catch (err) {
    return { error: mapAiActionError(err) }
  }

  await logAudit({
    action: "rfq.drafted",
    entityType: "part_alternative",
    entityId: alternativeId,
    metadata: { vendorName, spec: alternative.alternative_spec },
  })

  return { email }
}

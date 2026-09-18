"use server"

import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit/log"
import { canAccept } from "@/lib/auth/roles"
import { requireUser } from "@/lib/auth/session"
import { processBom } from "@/lib/boms/process"
import { computeBomTotals } from "@/lib/boms/totals"
import type { Bom, BomItem, PartAlternative } from "@/lib/db/types"
import { createServerClient } from "@/lib/supabase/server"

export async function acceptAlternativeAction(
  alternativeId: string,
): Promise<{ ok: true } | { error: string }> {
  const { profile } = await requireUser()
  if (!canAccept(profile.role)) {
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
  const { error: acceptError } = await supabase.rpc("accept_part_alternative", {
    p_alternative_id: alternativeId,
  })
  if (acceptError) {
    console.error("alternative accept rpc failed", acceptError)
    return { error: "Could not update alternative" }
  }

  const { data: item, error: itemError } = await supabase
    .from("bom_items")
    .select("bom_id")
    .eq("id", alternative.bom_item_id)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle()

  if (itemError || !item) {
    return { error: "BOM item not found" }
  }

  const bomId = item.bom_id as string
  const totalsError = await persistBomTotals(supabase, bomId, profile.tenant_id)
  if (totalsError) return { error: totalsError }

  await logAudit({
    action: "alternative.accepted",
    entityType: "part_alternative",
    entityId: alternativeId,
    metadata: { bomItemId: alternative.bom_item_id, bomId },
  })

  revalidatePath(`/app/boms/${bomId}`)
  revalidatePath("/app/boms")
  return { ok: true }
}

export async function rejectAlternativeAction(
  alternativeId: string,
): Promise<{ ok: true } | { error: string }> {
  const { profile } = await requireUser()
  if (!canAccept(profile.role)) {
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
  const { error } = await supabase
    .from("part_alternatives")
    .update({ status: "REJECTED" })
    .eq("id", alternativeId)
    .eq("tenant_id", profile.tenant_id)

  if (error) {
    console.error("alternative reject failed", error)
    return { error: "Could not reject alternative" }
  }

  const { data: item, error: itemError } = await supabase
    .from("bom_items")
    .select("bom_id")
    .eq("id", alternative.bom_item_id)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle()

  if (itemError || !item) {
    return { error: "BOM item not found" }
  }

  const bomId = item.bom_id as string
  const totalsError = await persistBomTotals(supabase, bomId, profile.tenant_id)
  if (totalsError) return { error: totalsError }

  await logAudit({
    action: "alternative.rejected",
    entityType: "part_alternative",
    entityId: alternativeId,
    metadata: { bomItemId: alternative.bom_item_id, bomId },
  })

  revalidatePath(`/app/boms/${bomId}`)
  revalidatePath("/app/boms")
  return { ok: true }
}

export async function retryBomAction(bomId: string): Promise<{ ok: true } | { error: string }> {
  const { profile } = await requireUser()
  const supabase = await createServerClient()

  const { data: bom, error } = await supabase
    .from("boms")
    .select("*")
    .eq("id", bomId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle()

  if (error || !bom) {
    return { error: "BOM not found" }
  }

  const record = bom as Bom
  if (record.status !== "FAILED") {
    return { error: "Only failed BOMs can be retried" }
  }
  if (!record.source_storage_path) {
    return { error: "Upload is missing; re-upload the file" }
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from("bom-uploads")
    .download(record.source_storage_path)

  if (downloadError || !file) {
    console.error("bom retry download failed", downloadError)
    return { error: "Could not download the original file" }
  }

  const buffer = await file.arrayBuffer()
  const filename = record.source_filename || record.source_storage_path.split("/").pop() || "upload"
  const mime = record.source_mime || ""

  try {
    await processBom(bomId, profile.tenant_id, buffer, mime, filename)
  } catch (err) {
    const message = err instanceof Error ? err.message : "BOM processing failed"
    return { error: message }
  }

  revalidatePath(`/app/boms/${bomId}`)
  revalidatePath("/app/boms")
  return { ok: true }
}

async function persistBomTotals(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  bomId: string,
  tenantId: string,
): Promise<string | null> {
  const { data: items, error: itemsError } = await supabase
    .from("bom_items")
    .select("*")
    .eq("bom_id", bomId)
    .eq("tenant_id", tenantId)

  if (itemsError || !items) {
    return "Could not load BOM items"
  }

  const itemRows = items as BomItem[]
  const itemIds = itemRows.map((row) => row.id)
  const acceptedByItem = new Map<string, number>()

  if (itemIds.length > 0) {
    const { data: alts, error: altsError } = await supabase
      .from("part_alternatives")
      .select("bom_item_id, alternative_unit_cost")
      .eq("tenant_id", tenantId)
      .eq("status", "ACCEPTED")
      .in("bom_item_id", itemIds)

    if (altsError) {
      return "Could not load accepted alternatives"
    }

    for (const alt of alts ?? []) {
      if (alt.alternative_unit_cost != null) {
        acceptedByItem.set(alt.bom_item_id as string, Number(alt.alternative_unit_cost))
      }
    }
  }

  const totals = computeBomTotals(
    itemRows.map((row) => ({
      quantity: Number(row.quantity_per_vehicle),
      currentUnitCost: row.current_unit_cost == null ? null : Number(row.current_unit_cost),
      acceptedAlternativeUnitCost: acceptedByItem.get(row.id) ?? null,
    })),
  )

  const { error: updateError } = await supabase
    .from("boms")
    .update({
      total_original_cost: totals.totalOriginalCost,
      total_optimized_cost: totals.totalOptimizedCost,
      total_savings_pct: totals.totalSavingsPct,
    })
    .eq("id", bomId)
    .eq("tenant_id", tenantId)

  if (updateError) {
    console.error("bom totals update failed", updateError)
    return "Could not update BOM totals"
  }

  return null
}

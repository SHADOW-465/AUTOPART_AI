"use server"

import { logAudit } from "@/lib/audit/log"
import { canValidate } from "@/lib/auth/roles"
import { requireUser } from "@/lib/auth/session"
import type { BomItem, PartAlternative, StandardSpecRow } from "@/lib/db/types"
import { VALIDATE_MODEL } from "@/lib/groq/client"
import { validateAlternative, type ValidationReport } from "@/lib/groq/validate"
import { createServerClient } from "@/lib/supabase/server"
import { mapAiActionError } from "@/lib/actions/ai-errors"
import { findSpecByKey } from "@/lib/matching/lookup"
import type { StandardSpec } from "@/lib/matching/types"

export async function runValidationAction(
  alternativeId: string,
): Promise<{ report: ValidationReport } | { error: string }> {
  const { user, profile } = await requireUser()
  if (!canValidate(profile.role)) {
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
  let originalCatalog: unknown = {}
  let alternativeCatalog: unknown = {}

  if (bomItem.canonical_spec_key) {
    const { data: specs } = await supabase.from("standard_specs").select("*")
    const rows = (specs ?? []) as StandardSpecRow[]
    const catalogSpecs = rows.map((row) => ({
      id: row.id,
      body: row.body as StandardSpec["body"],
      code: row.code,
      partFamily: row.part_family,
      canonicalKey: row.canonical_key,
    }))
    const originalSpec = findSpecByKey(bomItem.canonical_spec_key, catalogSpecs)
    if (originalSpec) {
      const row = rows.find((s) => s.id === originalSpec.id)
      if (row) originalCatalog = row.mechanical
    }
  }

  if (alternative.standard_spec_id) {
    const { data: altSpec } = await supabase
      .from("standard_specs")
      .select("*")
      .eq("id", alternative.standard_spec_id)
      .maybeSingle()
    if (altSpec) alternativeCatalog = (altSpec as StandardSpecRow).mechanical
  }

  let report: ValidationReport
  try {
    report = await validateAlternative({
      originalSpec: bomItem.original_spec ?? "",
      originalCatalog,
      alternativeSpec: alternative.alternative_spec,
      alternativeCatalog,
    })
  } catch (err) {
    return { error: mapAiActionError(err) }
  }

  const { error: insertError } = await supabase.from("technical_validations").insert({
    alternative_id: alternativeId,
    tenant_id: profile.tenant_id,
    ai_engine: VALIDATE_MODEL,
    material_composition_result: report.material_composition_result,
    mechanical_properties_result: report.mechanical_properties_result,
    dimensional_fit_result: report.dimensional_fit_result,
    recommendation: report.recommendation,
    validation_summary_markdown: report.summary_markdown,
    report_json: report,
    validated_by: user.id,
  })

  if (insertError) {
    console.error("technical_validations insert failed", insertError)
    return { error: "Could not save validation" }
  }

  await logAudit({
    action: "validation.ran",
    entityType: "part_alternative",
    entityId: alternativeId,
    metadata: { recommendation: report.recommendation, bomItemId: alternative.bom_item_id },
  })

  return { report }
}

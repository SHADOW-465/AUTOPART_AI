import { transaction, type Db } from "@/lib/db/client"
import { rematchItemById } from "@/lib/boms/rematch"
import { getAlternative } from "@/lib/repo/alternatives"
import { logEvent } from "@/lib/repo/audit"
import { getBom, getItem } from "@/lib/repo/boms"
import { createRfq, getRfq, saveQuote, setRfqStatus, type RfqView } from "@/lib/repo/rfqs"
import { getSettings } from "@/lib/repo/settings"
import { getSpec } from "@/lib/repo/standards"
import { getSupplier, upsertPrice } from "@/lib/repo/suppliers"
import type { RfqStatus } from "@/lib/db/types"
import { buildRfq, rfqCode } from "./template"

const COATING_NOTE = /zinc[\s-]*flake|geomet|dacromet|iso\s*10683/i

/** Drafts an RFQ for a line's IS alternative, addressed to the given supplier (default: the alternative's own). */
export function createRfqForAlternative(db: Db, alternativeId: string, supplierId?: string | null): RfqView {
  return transaction(db, () => {
    const alt = getAlternative(db, alternativeId)
    if (!alt) throw new Error("Alternative not found.")
    const item = getItem(db, alt.bom_item_id)
    if (!item) throw new Error("BOM line not found.")
    const bom = getBom(db, item.bom_id)!
    const targetSupplierId = supplierId || alt.supplier_id
    if (!targetSupplierId) throw new Error("Choose a supplier for this RFQ.")
    const supplier = getSupplier(db, targetSupplierId)
    if (!supplier) throw new Error("Supplier not found.")
    const spec = alt.standard_spec_id ? getSpec(db, alt.standard_spec_id) : null

    const code = rfqCode()
    const target = item.current_unit_cost ?? alt.unit_cost
    const { subject, body } = buildRfq({
      rfqCode: code,
      supplierName: supplier.name,
      supplierContact: supplier.contact_name,
      isCode: alt.indian_standard_code,
      partFamily: spec?.part_family ?? null,
      mechanical: spec?.mechanical ?? {},
      sourceSpec: item.original_spec,
      partName: item.part_name,
      partNumber: item.part_number,
      quantityPerVehicle: item.quantity,
      annualVolume: bom.annual_volume,
      targetUnitCost: target,
      coatingNote: COATING_NOTE.test(item.original_spec ?? "") ? "Zinc-flake to IS 16647 (not electro-zinc)" : null,
      settings: getSettings(db),
    })

    const rfq = createRfq(db, {
      rfq_code: code,
      bom_id: bom.id,
      bom_item_id: item.id,
      supplier_id: supplier.id,
      standard_spec_id: alt.standard_spec_id,
      spec_code: alt.indian_standard_code,
      part_label: [item.part_number, item.part_name].filter(Boolean).join(" · ") || null,
      supplier_name: supplier.name,
      supplier_email: supplier.email,
      annual_quantity: item.quantity * bom.annual_volume || null,
      target_unit_cost: target,
      subject,
      body,
    })
    logEvent(db, {
      bom_id: bom.id,
      entity_type: "rfq",
      entity_id: rfq.id,
      action: "rfq.created",
      summary: `Line ${item.line_number}: drafted ${code} to ${supplier.name} for ${alt.indian_standard_code}.`,
    })
    return getRfq(db, rfq.id)!
  })
}

export function changeRfqStatus(db: Db, rfqId: string, status: Extract<RfqStatus, "SENT" | "CLOSED" | "DRAFT">): void {
  transaction(db, () => {
    const rfq = getRfq(db, rfqId)
    if (!rfq) throw new Error("RFQ not found.")
    setRfqStatus(db, rfqId, status)
    logEvent(db, {
      bom_id: rfq.bom_id,
      entity_type: "rfq",
      entity_id: rfqId,
      action: `rfq.${status.toLowerCase()}`,
      summary: `${rfq.rfq_code} to ${rfq.supplier_name} marked ${status.toLowerCase()}.`,
    })
  })
}

/**
 * Records a supplier quote: saves it on the RFQ, writes it to the supplier's price list,
 * and re-matches the BOM line so the alternative and savings reflect the quoted price.
 */
export function recordQuote(
  db: Db,
  rfqId: string,
  quote: { unit_cost: number; lead_time_days: number | null; valid_until: string | null; notes: string | null },
): void {
  transaction(db, () => {
    const rfq = getRfq(db, rfqId)
    if (!rfq) throw new Error("RFQ not found.")
    if (!(quote.unit_cost >= 0)) throw new Error("Enter the quoted unit price.")
    saveQuote(db, rfqId, quote)
    if (rfq.supplier_id && rfq.standard_spec_id) {
      upsertPrice(db, {
        supplier_id: rfq.supplier_id,
        standard_spec_id: rfq.standard_spec_id,
        unit_cost: quote.unit_cost,
        lead_time_days: quote.lead_time_days,
        valid_until: quote.valid_until,
        source: "RFQ",
      })
    }
    if (rfq.bom_item_id) rematchItemById(db, rfq.bom_item_id)
    logEvent(db, {
      bom_id: rfq.bom_id,
      entity_type: "rfq",
      entity_id: rfqId,
      action: "rfq.quoted",
      summary: `${rfq.supplier_name} quoted INR ${quote.unit_cost.toFixed(2)} for ${rfq.spec_code} (${rfq.rfq_code}).`,
    })
  })
}

"use server"

import { rematchItemById } from "@/lib/boms/rematch"
import { getDb } from "@/lib/db/app"
import { transaction } from "@/lib/db/client"
import type { CustomerStatus } from "@/lib/db/types"
import { CUSTOMER_STATUS_LABELS } from "@/lib/labels"
import {
  acceptAlternative,
  getAlternative,
  rejectAlternative,
  resetAlternative,
  setCustomerStatus,
} from "@/lib/repo/alternatives"
import { logEvent } from "@/lib/repo/audit"
import { getItem, updateItemFields } from "@/lib/repo/boms"
import { getSupplier } from "@/lib/repo/suppliers"
import { FormError, optionalNumber, optionalText, refresh, text, toError, type ActionResult, type ActionState } from "./form"

export async function updateLineAction(itemId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const db = getDb()
    transaction(db, () => {
      const item = getItem(db, itemId)
      if (!item) throw new FormError("Line not found.")
      const spec = optionalText(fd, "original_spec")
      updateItemFields(db, itemId, {
        part_number: optionalText(fd, "part_number"),
        part_name: optionalText(fd, "part_name"),
        category: optionalText(fd, "category"),
        original_spec: spec,
        quantity: optionalNumber(fd, "quantity", "Quantity", { min: 0 }) ?? 1,
        current_unit_cost: optionalNumber(fd, "current_unit_cost", "Current unit cost", { min: 0 }),
        current_supplier: optionalText(fd, "current_supplier"),
      })
      rematchItemById(db, itemId)
      const after = getItem(db, itemId)!
      logEvent(db, {
        bom_id: item.bom_id,
        entity_type: "bom_item",
        entity_id: itemId,
        action: "line.edited",
        summary: `Line ${item.line_number} edited${spec !== item.original_spec ? ` (spec "${item.original_spec ?? ""}" → "${spec ?? ""}")` : ""}; ${after.match_status === "MATCHED" ? "matched" : "needs review"}.`,
      })
    })
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true, message: "Line saved and re-matched." }
}

type Decision = "accept" | "reject" | "reset"

export async function decideAction(alternativeId: string, decision: Decision): Promise<ActionResult> {
  try {
    const db = getDb()
    transaction(db, () => {
      const alt = getAlternative(db, alternativeId)
      if (!alt) throw new FormError("Alternative not found.")
      const item = getItem(db, alt.bom_item_id)!
      const supplier = alt.supplier_id ? getSupplier(db, alt.supplier_id)?.name : null
      if (decision === "accept") acceptAlternative(db, alternativeId)
      else if (decision === "reject") rejectAlternative(db, alternativeId)
      else resetAlternative(db, alternativeId)
      const verb = decision === "accept" ? "Accepted" : decision === "reject" ? "Rejected" : "Reset decision on"
      logEvent(db, {
        bom_id: item.bom_id,
        entity_type: "part_alternative",
        entity_id: alternativeId,
        action: `alternative.${decision}`,
        summary: `Line ${item.line_number}: ${verb} ${alt.indian_standard_code}${supplier ? ` from ${supplier}` : ""}.`,
      })
    })
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true }
}

export async function customerStatusAction(alternativeId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const status = text(fd, "customer_status") as CustomerStatus
    if (!(status in CUSTOMER_STATUS_LABELS)) throw new FormError("Choose a customer status.")
    const db = getDb()
    transaction(db, () => {
      const alt = setCustomerStatus(db, alternativeId, {
        customer_status: status,
        customer_ref: optionalText(fd, "customer_ref"),
        customer_notes: optionalText(fd, "customer_notes"),
      })
      const item = getItem(db, alt.bom_item_id)!
      logEvent(db, {
        bom_id: item.bom_id,
        entity_type: "part_alternative",
        entity_id: alternativeId,
        action: "alternative.customer_status",
        summary: `Line ${item.line_number}: ${CUSTOMER_STATUS_LABELS[status]}${alt.customer_ref ? ` (${alt.customer_ref})` : ""}.`,
      })
    })
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true, message: "Customer status saved." }
}

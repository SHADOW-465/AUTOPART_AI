"use server"

import { getDb } from "@/lib/db/client"
import { changeRfqStatus, createRfqForAlternative, recordQuote } from "@/lib/rfq/service"
import { optionalNumber, optionalText, refresh, requiredNumber, toError, type ActionResult, type ActionState } from "./form"

export async function createRfqAction(alternativeId: string, supplierId: string | null): Promise<ActionResult & { rfqId?: string }> {
  try {
    const rfq = createRfqForAlternative(getDb(), alternativeId, supplierId)
    refresh()
    return { ok: true, message: `${rfq.rfq_code} drafted.`, rfqId: rfq.id }
  } catch (error) {
    return toError(error)
  }
}

export async function rfqStatusAction(rfqId: string, status: "SENT" | "CLOSED" | "DRAFT"): Promise<ActionResult> {
  try {
    changeRfqStatus(getDb(), rfqId, status)
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true }
}

export async function recordQuoteAction(rfqId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    recordQuote(getDb(), rfqId, {
      unit_cost: requiredNumber(fd, "unit_cost", "Quoted unit price", { min: 0 }),
      lead_time_days: optionalNumber(fd, "lead_time_days", "Lead time", { min: 0, integer: true }),
      valid_until: optionalText(fd, "valid_until"),
      notes: optionalText(fd, "notes"),
    })
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true, message: "Quote recorded. Price list and BOM line updated." }
}

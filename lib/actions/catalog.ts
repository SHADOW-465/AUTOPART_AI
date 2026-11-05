"use server"

import { redirect } from "next/navigation"
import { getDb } from "@/lib/db/app"
import { STANDARD_BODIES, type Equivalence, type MechanicalFields, type StandardBody } from "@/lib/db/types"
import { saveSettings } from "@/lib/repo/settings"
import { addEquivalence, addSpec, deleteEquivalence, deleteSpec } from "@/lib/repo/standards"
import { deletePrice, deleteSupplier, saveSupplier, upsertPrice } from "@/lib/repo/suppliers"
import {
  checkbox,
  FormError,
  optionalNumber,
  optionalText,
  refresh,
  requiredNumber,
  text,
  toError,
  type ActionResult,
  type ActionState,
} from "./form"

// ---------- Suppliers ----------

export async function saveSupplierAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const existingId = optionalText(fd, "id")
  let id: string
  try {
    id = saveSupplier(getDb(), {
      id: existingId,
      name: text(fd, "name"),
      industrial_hub: optionalText(fd, "industrial_hub"),
      state: optionalText(fd, "state"),
      contact_name: optionalText(fd, "contact_name"),
      email: optionalText(fd, "email"),
      phone: optionalText(fd, "phone"),
      bis_licence_no: optionalText(fd, "bis_licence_no"),
      iatf_16949: checkbox(fd, "iatf_16949"),
      iso_9001: checkbox(fd, "iso_9001"),
      rating: optionalNumber(fd, "rating", "Rating", { min: 0, max: 5 }),
      lead_time_days: optionalNumber(fd, "lead_time_days", "Lead time", { min: 0, integer: true }),
      notes: optionalText(fd, "notes"),
    })
  } catch (error) {
    return toError(error)
  }
  refresh()
  if (!existingId) redirect(`/suppliers/${id}`)
  return { ok: true, message: "Supplier saved." }
}

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  try {
    deleteSupplier(getDb(), id)
  } catch (error) {
    return toError(error)
  }
  refresh()
  redirect("/suppliers")
}

export async function savePriceAction(supplierId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const specId = text(fd, "standard_spec_id")
    if (!specId) throw new FormError("Choose an Indian Standard.")
    upsertPrice(getDb(), {
      supplier_id: supplierId,
      standard_spec_id: specId,
      unit_cost: requiredNumber(fd, "unit_cost", "Unit price", { min: 0 }),
      lead_time_days: optionalNumber(fd, "lead_time_days", "Lead time", { min: 0, integer: true }),
      valid_until: optionalText(fd, "valid_until"),
      source: "MANUAL",
    })
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true, message: "Price saved. Re-match BOMs to use it." }
}

export async function deletePriceAction(id: string): Promise<ActionResult> {
  try {
    deletePrice(getDb(), id)
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true }
}

// ---------- Standards ----------

export async function addSpecAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const body = text(fd, "body") as StandardBody
    if (!STANDARD_BODIES.includes(body)) throw new FormError("Choose a standards body.")
    const family = text(fd, "part_family")
    if (!family) throw new FormError("Part family is required, e.g. hex head bolt.")
    const mechanical: MechanicalFields = {}
    const propertyClass = optionalText(fd, "property_class")
    if (propertyClass) mechanical.property_class = propertyClass
    const tensile = optionalNumber(fd, "tensile_mpa_min", "Tensile strength", { min: 0 })
    if (tensile != null) mechanical.tensile_mpa_min = tensile
    const yieldMin = optionalNumber(fd, "yield_mpa_min", "Yield strength", { min: 0 })
    if (yieldMin != null) mechanical.yield_mpa_min = yieldMin
    const hardness = optionalText(fd, "hardness")
    if (hardness) mechanical.hardness = hardness
    const thread = optionalText(fd, "thread_fit")
    if (thread) mechanical.thread_fit = thread
    const spec = addSpec(getDb(), {
      body,
      code: text(fd, "code"),
      part_family: family,
      mechanical,
      notes: optionalText(fd, "notes"),
      source_ref: optionalText(fd, "source_ref"),
    })
    refresh()
    return { ok: true, message: `${spec.code} added (match key ${spec.canonical_key}).` }
  } catch (error) {
    return toError(error)
  }
}

export async function addEquivalenceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const level = text(fd, "equivalence") as Equivalence
    if (!["EQUIVALENT", "NEAR", "NOT_EQUIVALENT"].includes(level)) throw new FormError("Choose an equivalence level.")
    addEquivalence(getDb(), {
      from_spec_id: text(fd, "from_spec_id"),
      to_spec_id: text(fd, "to_spec_id"),
      equivalence: level,
      notes: optionalText(fd, "notes"),
      source_ref: optionalText(fd, "source_ref"),
    })
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true, message: "Equivalence added. Re-match BOMs to apply it." }
}

export async function deleteSpecAction(id: string): Promise<ActionResult> {
  try {
    deleteSpec(getDb(), id)
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true }
}

export async function deleteEquivalenceAction(id: string): Promise<ActionResult> {
  try {
    deleteEquivalence(getDb(), id)
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true }
}

// ---------- Settings ----------

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    saveSettings(getDb(), {
      company_name: text(fd, "company_name"),
      plant_location: text(fd, "plant_location"),
      contact_name: text(fd, "contact_name"),
      contact_email: text(fd, "contact_email"),
      contact_phone: text(fd, "contact_phone"),
      gstin: text(fd, "gstin").toUpperCase(),
      default_annual_volume: optionalNumber(fd, "default_annual_volume", "Default annual volume", { min: 0, integer: true }) ?? 0,
    })
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true, message: "Settings saved." }
}

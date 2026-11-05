"use client"

import { useActionState } from "react"
import { deletePriceAction, deleteSupplierAction, savePriceAction, saveSupplierAction } from "@/lib/actions/catalog"
import type { Supplier } from "@/lib/db/types"
import { ActionButton, FormMessage, SubmitButton } from "./client"
import { Field, inputClass, textareaClass } from "./ui"

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const [state, formAction] = useActionState(saveSupplierAction, null)
  const s = supplier
  return (
    <form action={formAction} className="space-y-3">
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Supplier name" htmlFor="s-name">
          <input id="s-name" name="name" required defaultValue={s?.name ?? ""} className={inputClass} />
        </Field>
        <Field label="BIS licence no. (CM/L)" htmlFor="s-bis" hint="Required for products under a Quality Control Order">
          <input id="s-bis" name="bis_licence_no" defaultValue={s?.bis_licence_no ?? ""} className={inputClass} />
        </Field>
        <Field label="Industrial hub / city" htmlFor="s-hub">
          <input id="s-hub" name="industrial_hub" defaultValue={s?.industrial_hub ?? ""} className={inputClass} placeholder="e.g. Chennai" />
        </Field>
        <Field label="State" htmlFor="s-state">
          <input id="s-state" name="state" defaultValue={s?.state ?? ""} className={inputClass} />
        </Field>
        <Field label="Contact person" htmlFor="s-contact">
          <input id="s-contact" name="contact_name" defaultValue={s?.contact_name ?? ""} className={inputClass} />
        </Field>
        <Field label="Email (for RFQs)" htmlFor="s-email">
          <input id="s-email" name="email" type="email" defaultValue={s?.email ?? ""} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="s-phone">
          <input id="s-phone" name="phone" defaultValue={s?.phone ?? ""} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default lead time (days)" htmlFor="s-lead">
            <input id="s-lead" name="lead_time_days" inputMode="numeric" defaultValue={s?.lead_time_days ?? ""} className={inputClass} />
          </Field>
          <Field label="Rating (0–5)" htmlFor="s-rating">
            <input id="s-rating" name="rating" inputMode="decimal" defaultValue={s?.rating ?? ""} className={inputClass} />
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="iatf_16949" defaultChecked={s?.iatf_16949 ?? false} className="h-4 w-4 accent-brand-blue" /> IATF 16949 certified
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="iso_9001" defaultChecked={s?.iso_9001 ?? false} className="h-4 w-4 accent-brand-blue" /> ISO 9001 certified
        </label>
      </div>
      <Field label="Notes" htmlFor="s-notes">
        <textarea id="s-notes" name="notes" rows={2} defaultValue={s?.notes ?? ""} className={textareaClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Saving…">{s ? "Save supplier" : "Add supplier"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

export function DeleteSupplierButton({ supplier }: { supplier: Supplier }) {
  return (
    <ActionButton
      action={() => deleteSupplierAction(supplier.id)}
      variant="danger"
      confirm={`Delete ${supplier.name}? Its price list is removed; existing BOM alternatives from this supplier lose their supplier link.`}
    >
      Delete supplier
    </ActionButton>
  )
}

export function PriceForm({ supplierId, specs }: { supplierId: string; specs: { id: string; code: string; family: string }[] }) {
  const [state, formAction] = useActionState(savePriceAction.bind(null, supplierId), null)
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <Field label="Indian Standard" htmlFor="p-spec" className="lg:col-span-2">
        <select id="p-spec" name="standard_spec_id" required className={inputClass} defaultValue="">
          <option value="" disabled>
            Choose IS spec…
          </option>
          {specs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} ({s.family})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Unit price (₹)" htmlFor="p-cost">
        <input id="p-cost" name="unit_cost" inputMode="decimal" required className={inputClass} />
      </Field>
      <Field label="Lead time (days)" htmlFor="p-lead">
        <input id="p-lead" name="lead_time_days" inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="Valid until" htmlFor="p-valid">
        <input id="p-valid" name="valid_until" type="date" className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-5">
        <SubmitButton size="sm">Save price</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

export function DeletePriceButton({ id }: { id: string }) {
  return (
    <ActionButton action={() => deletePriceAction(id)} variant="ghost" confirm="Remove this price?">
      Remove
    </ActionButton>
  )
}

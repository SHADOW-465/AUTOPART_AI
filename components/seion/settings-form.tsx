"use client"

import { useActionState } from "react"
import { saveSettingsAction } from "@/lib/actions/catalog"
import type { Settings } from "@/lib/db/types"
import { FormMessage, SubmitButton } from "./client"
import { Field, inputClass } from "./ui"

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction] = useActionState(saveSettingsAction, null)
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company name" htmlFor="st-company">
          <input id="st-company" name="company_name" defaultValue={settings.company_name} className={inputClass} placeholder="e.g. Acme Auto Components Pvt Ltd" />
        </Field>
        <Field label="Plant location / delivery address" htmlFor="st-loc">
          <input id="st-loc" name="plant_location" defaultValue={settings.plant_location} className={inputClass} placeholder="e.g. Sriperumbudur, Chennai" />
        </Field>
        <Field label="Contact person" htmlFor="st-contact" hint="Signs RFQs and the proposal pack">
          <input id="st-contact" name="contact_name" defaultValue={settings.contact_name} className={inputClass} />
        </Field>
        <Field label="Contact email" htmlFor="st-email">
          <input id="st-email" name="contact_email" type="email" defaultValue={settings.contact_email} className={inputClass} />
        </Field>
        <Field label="Contact phone" htmlFor="st-phone">
          <input id="st-phone" name="contact_phone" defaultValue={settings.contact_phone} className={inputClass} />
        </Field>
        <Field label="GSTIN" htmlFor="st-gstin">
          <input id="st-gstin" name="gstin" defaultValue={settings.gstin} className={inputClass} maxLength={15} />
        </Field>
        <Field label="Default annual vehicle volume" htmlFor="st-volume" hint="Pre-filled on new BOM uploads">
          <input id="st-volume" name="default_annual_volume" inputMode="numeric" defaultValue={settings.default_annual_volume} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

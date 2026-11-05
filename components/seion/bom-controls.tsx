"use client"

import { useActionState } from "react"
import { RefreshCw, RotateCcw, Trash2 } from "lucide-react"
import { deleteBomAction, reimportBomAction, rematchBomAction, updateBomMetaAction } from "@/lib/actions/boms"
import type { Bom } from "@/lib/db/types"
import { ActionButton, FormMessage, SubmitButton } from "./client"
import { Field, inputClass } from "./ui"

export function BomActions({ bom }: { bom: Bom }) {
  return (
    <>
      <ActionButton
        action={() => rematchBomAction(bom.id)}
        title="Re-run matching against the current standards library and price list. Accepted decisions are kept."
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Re-match
      </ActionButton>
      {bom.source_filename ? (
        <ActionButton
          action={() => reimportBomAction(bom.id)}
          confirm="Re-import from the original file? Line edits and decisions on this BOM will be replaced."
          title="Parse the original upload again"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Re-import
        </ActionButton>
      ) : null}
      <ActionButton
        action={() => deleteBomAction(bom.id)}
        variant="danger"
        confirm={`Delete ${bom.bom_code} "${bom.title}"? Its lines, decisions and activity log are removed. RFQs are kept.`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
      </ActionButton>
    </>
  )
}

export function BomMetaForm({ bom }: { bom: Bom }) {
  const [state, formAction] = useActionState(updateBomMetaAction.bind(null, bom.id), null)
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <Field label="Title" htmlFor="bom-title" className="lg:col-span-2">
        <input id="bom-title" name="title" defaultValue={bom.title} className={inputClass} required />
      </Field>
      <Field label="Customer" htmlFor="bom-customer">
        <input id="bom-customer" name="customer_name" defaultValue={bom.customer_name ?? ""} className={inputClass} />
      </Field>
      <Field label="Vehicle platform" htmlFor="bom-platform">
        <input id="bom-platform" name="vehicle_platform" defaultValue={bom.vehicle_platform ?? ""} className={inputClass} />
      </Field>
      <Field label="Annual volume" htmlFor="bom-volume">
        <input id="bom-volume" name="annual_volume" inputMode="numeric" defaultValue={bom.annual_volume} className={inputClass} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
        <SubmitButton size="sm" variant="secondary">
          Save details
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

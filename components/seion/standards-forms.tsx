"use client"

import { useActionState } from "react"
import { addEquivalenceAction, addSpecAction, deleteEquivalenceAction, deleteSpecAction } from "@/lib/actions/catalog"
import { STANDARD_BODIES } from "@/lib/db/types"
import { ActionButton, FormMessage, SubmitButton } from "./client"
import { Field, inputClass, textareaClass } from "./ui"

export type SpecOption = { id: string; code: string; body: string; family: string }

export function AddSpecForm() {
  const [state, formAction] = useActionState(addSpecAction, null)
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Body" htmlFor="sp-body">
          <select id="sp-body" name="body" className={inputClass} defaultValue="DIN">
            {STANDARD_BODIES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label="Code" htmlFor="sp-code" className="col-span-2" hint="As written on drawings, e.g. DIN 439 or IS 1364 Part 4">
          <input id="sp-code" name="code" required className={inputClass} />
        </Field>
      </div>
      <Field label="Part family" htmlFor="sp-family" hint="Same family on both sides of an equivalence, e.g. hex thin nut">
        <input id="sp-family" name="part_family" required className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Property class" htmlFor="sp-class">
          <input id="sp-class" name="property_class" className={inputClass} placeholder="8.8" />
        </Field>
        <Field label="Tensile min (MPa)" htmlFor="sp-ts">
          <input id="sp-ts" name="tensile_mpa_min" inputMode="numeric" className={inputClass} />
        </Field>
        <Field label="Yield min (MPa)" htmlFor="sp-ys">
          <input id="sp-ys" name="yield_mpa_min" inputMode="numeric" className={inputClass} />
        </Field>
        <Field label="Hardness" htmlFor="sp-hard">
          <input id="sp-hard" name="hardness" className={inputClass} placeholder="200 HV" />
        </Field>
        <Field label="Thread fit" htmlFor="sp-thread">
          <input id="sp-thread" name="thread_fit" className={inputClass} placeholder="6g" />
        </Field>
      </div>
      <Field label="Notes" htmlFor="sp-notes">
        <textarea id="sp-notes" name="notes" rows={2} className={textareaClass} />
      </Field>
      <Field label="Source reference" htmlFor="sp-src" hint="Standard edition / clause you verified against">
        <input id="sp-src" name="source_ref" className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm">Add standard</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

export function AddEquivalenceForm({ specs }: { specs: SpecOption[] }) {
  const [state, formAction] = useActionState(addEquivalenceAction, null)
  const foreign = specs.filter((s) => s.body !== "IS")
  const indian = specs.filter((s) => s.body === "IS")
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="From (customer spec)" htmlFor="eq-from">
          <select id="eq-from" name="from_spec_id" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {foreign.concat(indian).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.family}
              </option>
            ))}
          </select>
        </Field>
        <Field label="To (Indian Standard)" htmlFor="eq-to">
          <select id="eq-to" name="to_spec_id" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {indian.concat(foreign).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.family}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Equivalence" htmlFor="eq-level">
        <select id="eq-level" name="equivalence" className={inputClass} defaultValue="EQUIVALENT">
          <option value="EQUIVALENT">Equivalent — drop-in</option>
          <option value="NEAR">Near — verify drawing details</option>
          <option value="NOT_EQUIVALENT">Not equivalent — block this pairing</option>
        </select>
      </Field>
      <Field label="Notes" htmlFor="eq-notes">
        <input id="eq-notes" name="notes" className={inputClass} placeholder="e.g. head height differs; check clearance" />
      </Field>
      <Field label="Source reference" htmlFor="eq-src">
        <input id="eq-src" name="source_ref" className={inputClass} placeholder="e.g. IS 1364-2:2018 Annex A" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm">Add equivalence</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

export function DeleteSpecButton({ id, code }: { id: string; code: string }) {
  return (
    <ActionButton
      action={() => deleteSpecAction(id)}
      variant="ghost"
      confirm={`Delete ${code}? Its equivalences and supplier prices are removed. Existing BOM lines keep their decisions until re-matched.`}
    >
      Delete
    </ActionButton>
  )
}

export function DeleteEquivalenceButton({ id, label }: { id: string; label: string }) {
  return (
    <ActionButton action={() => deleteEquivalenceAction(id)} variant="ghost" confirm={`Delete equivalence ${label}?`}>
      Delete
    </ActionButton>
  )
}

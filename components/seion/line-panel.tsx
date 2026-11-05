"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, Pencil, XCircle } from "lucide-react"
import { customerStatusAction, decideAction, updateLineAction } from "@/lib/actions/lines"
import { createRfqAction } from "@/lib/actions/rfqs"
import type { AlternativeLine, LineView } from "@/lib/boms/view"
import { CUSTOMER_STATUSES } from "@/lib/db/types"
import { inr, num, pct } from "@/lib/format"
import { CUSTOMER_STATUS_LABELS } from "@/lib/labels"
import { cn } from "@/lib/utils"
import { humanize, type CheckStatus } from "@/lib/validation/rules"
import {
  CertBadges,
  CustomerBadge,
  DecisionBadge,
  EquivalenceBadge,
  PriceSourceBadge,
  RecommendationBadge,
  RfqStatusBadge,
} from "./badges"
import { ActionButton, FormMessage, SubmitButton } from "./client"
import { Field, inputClass, textareaClass } from "./ui"

export type SupplierOption = { id: string; name: string }

export function LinePanel({ line, annualVolume, suppliers }: { line: LineView; annualVolume: number; suppliers: SupplierOption[] }) {
  const [editing, setEditing] = useState(false)
  const { item } = line

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
            Line {item.line_number}
            {item.part_number ? ` · ${item.part_number}` : ""}
          </p>
          <h2 className="text-lg font-bold text-brand-text-primary">{item.part_name || item.original_spec || "Unnamed line"}</h2>
          <p className="text-xs text-brand-text-secondary">
            {num(item.quantity)} / vehicle · current {inr(item.current_unit_cost)}
            {item.current_supplier ? ` · ${item.current_supplier}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-border px-2 py-1 text-xs font-semibold text-brand-text-primary hover:bg-gray-50"
          aria-expanded={editing}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden /> {editing ? "Close" : "Edit line"}
        </button>
      </div>

      {editing ? <LineEditForm line={line} onSaved={() => setEditing(false)} /> : null}

      <Section title="Standards match">
        {item.match_status === "MATCHED" && line.fromSpec && line.toSpec ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-gray-100 px-2 py-1 font-semibold">{line.fromSpec.code}</span>
              <ArrowRight className="h-4 w-4 text-brand-text-secondary" aria-label="maps to" />
              <span className="rounded bg-blue-50 px-2 py-1 font-semibold text-brand-blue">{line.toSpec.code}</span>
              <EquivalenceBadge level={item.equivalence} />
            </div>
            <p className="text-xs text-brand-text-secondary">
              {humanize(line.toSpec.part_family)}
              {line.equivalenceNotes ? ` · ${line.equivalenceNotes}` : ""}
            </p>
            {item.original_spec ? <p className="text-xs text-brand-text-secondary">Customer spec: {item.original_spec}</p> : null}
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">No Indian Standard equivalent found</p>
            <p className="mt-1 text-xs">
              {item.original_spec ? <>Spec “{item.original_spec}” isn’t in the standards library. </> : <>This line has no spec. </>}
              Fix the spec with <em>Edit line</em>, or add the standard and its IS equivalence in the{" "}
              <Link href="/standards" className="font-semibold underline">
                Standards library
              </Link>{" "}
              and re-match.
            </p>
          </div>
        )}
      </Section>

      {line.validation ? (
        <Section title="Engineering validation" action={<RecommendationBadge value={line.validation.recommendation} />}>
          <ul className="space-y-1.5">
            {line.validation.checks.map((check) => (
              <li key={check.id} className="flex gap-2 text-xs">
                <CheckIcon status={check.status} />
                <span>
                  <span className="font-semibold text-brand-text-primary">{check.label}: </span>
                  <span className="text-brand-text-secondary">{check.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 rounded bg-gray-50 px-2 py-1.5 text-[11px] text-brand-text-secondary">
            Material {humanize(line.validation.material.toLowerCase())} · dimensional {humanize(line.validation.dimensional.toLowerCase())}. A
            change on an approved part needs customer approval (PPAP) before production use.
          </p>
        </Section>
      ) : null}

      {line.alternatives.length > 0 ? (
        <Section title={`Alternatives (${line.alternatives.length})`}>
          <ul className="space-y-3">
            {line.alternatives.map((alt) => (
              <AlternativeCard key={alt.id} alt={alt} annualVolume={annualVolume} suppliers={suppliers} />
            ))}
          </ul>
        </Section>
      ) : null}

      {line.rfqs.length > 0 ? (
        <Section title="RFQs for this line">
          <ul className="space-y-1.5 text-xs">
            {line.rfqs.map((rfq) => (
              <li key={rfq.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/rfqs#${rfq.id}`} className="font-semibold text-brand-blue">
                  {rfq.rfq_code}
                </Link>
                <span className="text-brand-text-secondary">{rfq.supplier_name}</span>
                <RfqStatusBadge status={rfq.status} />
                {rfq.quoted_unit_cost != null ? <span className="font-medium">{inr(rfq.quoted_unit_cost)}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-brand-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-brand-text-secondary">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function CheckIcon({ status }: { status: CheckStatus }) {
  if (status === "pass") return <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-brand-green" aria-label="Pass" />
  if (status === "warn") return <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" aria-label="Warning" />
  return <XCircle className="mt-px h-3.5 w-3.5 shrink-0 text-brand-red" aria-label="Fail" />
}

function AlternativeCard({ alt, annualVolume, suppliers }: { alt: AlternativeLine; annualVolume: number; suppliers: SupplierOption[] }) {
  const [rfqSupplier, setRfqSupplier] = useState<string>(alt.supplier_id ?? "")
  const d = alt.delta
  const costsMore = d.unitDelta != null && d.unitDelta < 0

  return (
    <li className={cn("rounded-lg border p-3", alt.status === "ACCEPTED" ? "border-brand-blue/40 bg-blue-50/40" : "border-brand-border", alt.status === "REJECTED" && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-text-primary">{alt.supplier_name ?? "No supplier quote yet"}</p>
          <p className="text-xs text-brand-text-secondary">
            {alt.indian_standard_code}
            {alt.supplier_hub ? ` · ${alt.supplier_hub}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <DecisionBadge status={alt.status} />
          <PriceSourceBadge source={alt.price_source} />
        </div>
      </div>
      {alt.supplier_id ? (
        <div className="mt-2">
          <CertBadges bis={alt.bis_licence_no} iatf={alt.iatf_16949} iso={alt.iso_9001} />
        </div>
      ) : null}
      {alt.unit_cost != null ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
          <Metric label="Unit price" value={inr(alt.unit_cost)} />
          <Metric label="vs current" value={d.pct == null ? "—" : `${d.pct >= 0 ? "−" : "+"}${pct(Math.abs(d.pct))}`} tone={costsMore ? "red" : "green"} />
          <Metric label="Per vehicle" value={d.perVehicle == null ? "—" : inr(d.perVehicle)} tone={costsMore ? "red" : "green"} />
          <Metric label={`Per year (${num(annualVolume, 0)})`} value={d.annual == null ? "—" : inr(d.annual, 0)} tone={costsMore ? "red" : "green"} />
          <Metric label="Lead time" value={alt.lead_time_days == null ? "—" : `${alt.lead_time_days} days`} />
        </dl>
      ) : (
        <p className="mt-2 text-xs text-brand-text-secondary">No price on file for {alt.indian_standard_code}. Send an RFQ to get one.</p>
      )}
      {costsMore ? (
        <p className="mt-1 text-[11px] text-brand-red">Costs more than today’s part; the case for switching is compliance (BIS / QCO), not price.</p>
      ) : null}
      {d.unitDelta == null && alt.unit_cost != null ? (
        <p className="mt-1 text-[11px] text-brand-text-secondary">Add the current unit cost (Edit line) to calculate savings.</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-start gap-2">
        {alt.supplier_id && alt.status !== "ACCEPTED" ? (
          <ActionButton action={() => decideAction(alt.id, "accept")} variant="primary">
            Accept
          </ActionButton>
        ) : null}
        {alt.status === "SUGGESTED" ? (
          <ActionButton action={() => decideAction(alt.id, "reject")}>Reject</ActionButton>
        ) : null}
        {alt.status !== "SUGGESTED" ? (
          <ActionButton action={() => decideAction(alt.id, "reset")} variant="ghost" confirm={alt.status === "ACCEPTED" ? "Undo acceptance? Customer approval tracking on this alternative will be cleared." : undefined}>
            Undo
          </ActionButton>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-brand-border pt-3">
        <Field label="Request quote from" htmlFor={`rfq-${alt.id}`} className="min-w-[10rem] flex-1">
          <select id={`rfq-${alt.id}`} className={inputClass} value={rfqSupplier} onChange={(e) => setRfqSupplier(e.target.value)}>
            <option value="">Choose supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <ActionButton action={() => createRfqAction(alt.id, rfqSupplier || null)} disabled={!rfqSupplier}>
          Draft RFQ
        </ActionButton>
      </div>

      {alt.status === "ACCEPTED" ? <CustomerApprovalForm alt={alt} /> : null}
    </li>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-brand-text-secondary">{label}</dt>
      <dd className={cn("truncate font-semibold", tone === "green" ? "text-brand-green" : tone === "red" ? "text-brand-red" : "text-brand-text-primary")}>{value}</dd>
    </div>
  )
}

function CustomerApprovalForm({ alt }: { alt: AlternativeLine }) {
  const [state, formAction] = useActionState(customerStatusAction.bind(null, alt.id), null)
  return (
    <form action={formAction} className="mt-3 space-y-2 rounded-lg border border-brand-border bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-brand-text-primary">Customer approval (PPAP / ECN)</p>
        <CustomerBadge status={alt.customer_status} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Status" htmlFor={`cs-${alt.id}`}>
          <select id={`cs-${alt.id}`} name="customer_status" defaultValue={alt.customer_status} className={inputClass}>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CUSTOMER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer reference" htmlFor={`cr-${alt.id}`}>
          <input id={`cr-${alt.id}`} name="customer_ref" defaultValue={alt.customer_ref ?? ""} className={inputClass} placeholder="ECN / PPAP no." />
        </Field>
      </div>
      <Field label="Notes" htmlFor={`cn-${alt.id}`}>
        <textarea id={`cn-${alt.id}`} name="customer_notes" rows={2} defaultValue={alt.customer_notes ?? ""} className={textareaClass} />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" variant="secondary">
          Save approval status
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

function LineEditForm({ line, onSaved }: { line: LineView; onSaved: () => void }) {
  const { item } = line
  const [state, formAction] = useActionState(async (prev: Parameters<typeof updateLineAction>[1], fd: FormData) => {
    const result = await updateLineAction(item.id, prev, fd)
    if (result?.ok) onSaved()
    return result
  }, null)
  const id = (k: string) => `${k}-${item.id}`
  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-brand-blue/30 bg-blue-50/30 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Part number" htmlFor={id("pn")}>
          <input id={id("pn")} name="part_number" defaultValue={item.part_number ?? ""} className={inputClass} />
        </Field>
        <Field label="Description" htmlFor={id("name")}>
          <input id={id("name")} name="part_name" defaultValue={item.part_name ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Specification" htmlFor={id("spec")} hint="e.g. DIN 933 M8x25 8.8 — re-matched on save">
        <input id={id("spec")} name="original_spec" defaultValue={item.original_spec ?? ""} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Qty / vehicle" htmlFor={id("qty")}>
          <input id={id("qty")} name="quantity" inputMode="decimal" defaultValue={item.quantity} className={inputClass} />
        </Field>
        <Field label="Current ₹ / unit" htmlFor={id("cost")}>
          <input id={id("cost")} name="current_unit_cost" inputMode="decimal" defaultValue={item.current_unit_cost ?? ""} className={inputClass} />
        </Field>
        <Field label="Category" htmlFor={id("cat")}>
          <input id={id("cat")} name="category" defaultValue={item.category ?? ""} className={inputClass} />
        </Field>
        <Field label="Current supplier" htmlFor={id("sup")}>
          <input id={id("sup")} name="current_supplier" defaultValue={item.current_supplier ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingText="Saving…">
          Save &amp; re-match
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}


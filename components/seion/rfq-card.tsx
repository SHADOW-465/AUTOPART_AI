"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { Mail } from "lucide-react"
import { recordQuoteAction, rfqStatusAction } from "@/lib/actions/rfqs"
import { date, inr, num } from "@/lib/format"
import type { RfqView } from "@/lib/repo/rfqs"
import { mailtoHref } from "@/lib/rfq/template"
import { RfqStatusBadge } from "./badges"
import { ActionButton, CopyButton, FormMessage, SubmitButton } from "./client"
import { buttonClass, Field, inputClass, textareaClass } from "./ui"

export function RfqCard({ rfq }: { rfq: RfqView }) {
  const [quoting, setQuoting] = useState(false)
  const open = rfq.status === "DRAFT" || rfq.status === "SENT"

  return (
    <article id={rfq.id} className="scroll-mt-4 rounded-xl border border-brand-border bg-white p-4 shadow-bevel target:ring-2 target:ring-brand-blue">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-brand-text-primary">
            {rfq.rfq_code} <RfqStatusBadge status={rfq.status} />
          </p>
          <p className="text-sm text-brand-text-primary">
            {rfq.spec_code}
            {rfq.part_label ? <span className="text-brand-text-secondary"> · {rfq.part_label}</span> : null}
          </p>
          <p className="text-xs text-brand-text-secondary">
            To {rfq.supplier_name}
            {rfq.supplier_email ? ` <${rfq.supplier_email}>` : " (no email on file)"} · created {date(rfq.created_at)}
            {rfq.sent_at ? ` · sent ${date(rfq.sent_at)}` : ""}
          </p>
          {rfq.bom_id ? (
            <Link href={`/boms/${rfq.bom_id}${rfq.bom_item_id ? `?line=${rfq.bom_item_id}` : ""}`} className="text-xs font-semibold text-brand-blue">
              {rfq.bom_code} · line {rfq.line_number ?? "—"}
            </Link>
          ) : (
            <span className="text-xs text-brand-text-secondary">BOM deleted</span>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <dt className="text-brand-text-secondary">Annual qty</dt>
            <dd className="font-semibold">{num(rfq.annual_quantity, 0)}</dd>
          </div>
          <div>
            <dt className="text-brand-text-secondary">Target</dt>
            <dd className="font-semibold">{inr(rfq.target_unit_cost)}</dd>
          </div>
          <div>
            <dt className="text-brand-text-secondary">Quoted</dt>
            <dd className="font-semibold text-brand-green">{inr(rfq.quoted_unit_cost)}</dd>
          </div>
        </dl>
      </div>

      {rfq.status === "QUOTED" ? (
        <p className="mt-2 text-xs text-brand-text-secondary">
          Quote: {inr(rfq.quoted_unit_cost)}
          {rfq.quoted_lead_time_days != null ? ` · ${rfq.quoted_lead_time_days} days` : ""}
          {rfq.quote_valid_until ? ` · valid until ${date(rfq.quote_valid_until)}` : ""}
          {rfq.quote_notes ? ` · ${rfq.quote_notes}` : ""}
        </p>
      ) : null}

      <details open={rfq.status === "DRAFT"} className="mt-3 rounded-lg border border-brand-border bg-gray-50">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-brand-text-primary">Email: {rfq.subject}</summary>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-brand-border px-3 py-2 font-sans text-xs text-brand-text-primary">{rfq.body}</pre>
      </details>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <CopyButton text={`Subject: ${rfq.subject}\n\n${rfq.body}`} label="Copy email" />
        <a href={mailtoHref(rfq.supplier_email, rfq.subject, rfq.body)} className={buttonClass("secondary", "sm")}>
          <Mail className="h-3.5 w-3.5" aria-hidden /> Open in mail app
        </a>
        {rfq.status === "DRAFT" ? (
          <ActionButton action={() => rfqStatusAction(rfq.id, "SENT")} variant="primary">
            Mark sent
          </ActionButton>
        ) : null}
        {open || rfq.status === "QUOTED" ? (
          <button type="button" className={buttonClass(rfq.status === "QUOTED" ? "ghost" : "primary", "sm")} onClick={() => setQuoting((v) => !v)} aria-expanded={quoting}>
            {rfq.status === "QUOTED" ? "Update quote" : "Record quote"}
          </button>
        ) : null}
        {rfq.status !== "CLOSED" ? (
          <ActionButton action={() => rfqStatusAction(rfq.id, "CLOSED")} variant="ghost">
            Close
          </ActionButton>
        ) : (
          <ActionButton action={() => rfqStatusAction(rfq.id, "DRAFT")} variant="ghost">
            Reopen
          </ActionButton>
        )}
      </div>

      {quoting ? <QuoteForm rfq={rfq} onDone={() => setQuoting(false)} /> : null}
    </article>
  )
}

function QuoteForm({ rfq, onDone }: { rfq: RfqView; onDone: () => void }) {
  const [state, formAction] = useActionState(async (prev: Parameters<typeof recordQuoteAction>[1], fd: FormData) => {
    const result = await recordQuoteAction(rfq.id, prev, fd)
    if (result?.ok) onDone()
    return result
  }, null)
  const id = (k: string) => `${k}-${rfq.id}`
  return (
    <form action={formAction} className="mt-3 space-y-2 rounded-lg border border-brand-blue/30 bg-blue-50/30 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="Unit price (₹)" htmlFor={id("price")}>
          <input id={id("price")} name="unit_cost" inputMode="decimal" required defaultValue={rfq.quoted_unit_cost ?? ""} className={inputClass} />
        </Field>
        <Field label="Lead time (days)" htmlFor={id("lead")}>
          <input id={id("lead")} name="lead_time_days" inputMode="numeric" defaultValue={rfq.quoted_lead_time_days ?? ""} className={inputClass} />
        </Field>
        <Field label="Valid until" htmlFor={id("valid")}>
          <input id={id("valid")} name="valid_until" type="date" defaultValue={rfq.quote_valid_until ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Notes" htmlFor={id("notes")} hint="e.g. BIS licence no., MOQ, Incoterms">
        <textarea id={id("notes")} name="notes" rows={2} defaultValue={rfq.quote_notes ?? ""} className={textareaClass} />
      </Field>
      <p className="text-[11px] text-brand-text-secondary">Saving updates {rfq.supplier_name}’s price list and re-prices the BOM line.</p>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingText="Saving…">
          Save quote
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

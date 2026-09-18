"use client"

import { useState } from "react"
import { draftRfqAction } from "@/lib/actions/rfq"

export function RfqPanel({
  alternativeId,
  canDraftRfq,
}: {
  alternativeId: string
  canDraftRfq: boolean
}) {
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!canDraftRfq) return null

  async function run() {
    setPending(true)
    setError(null)
    setCopied(false)
    const result = await draftRfqAction(alternativeId)
    if ("error" in result) setError(result.error)
    else setEmail(result.email)
    setPending(false)
  }

  async function copy() {
    if (!email) return
    await navigator.clipboard.writeText(email)
    setCopied(true)
  }

  return (
    <div className="mt-3 space-y-2 border-t border-brand-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-brand-text-primary">RFQ draft</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => void run()}
          className="rounded-lg border border-brand-border px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
        >
          {pending ? "Drafting…" : "Draft RFQ"}
        </button>
      </div>
      {email ? (
        <>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-[11px] text-brand-text-primary">
            {email}
          </pre>
          <button
            type="button"
            onClick={() => void copy()}
            className="text-[11px] font-semibold text-brand-blue"
          >
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
        </>
      ) : (
        <p className="text-xs text-brand-text-secondary">Draft an email to copy. Nothing is sent.</p>
      )}
      {error ? <p className="text-xs font-medium text-brand-red">{error}</p> : null}
    </div>
  )
}

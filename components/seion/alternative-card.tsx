"use client"

import { useState } from "react"
import { acceptAlternativeAction, rejectAlternativeAction } from "@/lib/actions/alternatives"
import type { PartAlternative } from "@/lib/db/types"
import { formatInr } from "@/components/seion/bom-table"

export function AlternativeCard({
  alternative,
  canAccept,
}: {
  alternative: PartAlternative
  canAccept: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run(kind: "accept" | "reject") {
    setPending(true)
    setError(null)
    const result =
      kind === "accept"
        ? await acceptAlternativeAction(alternative.id)
        : await rejectAlternativeAction(alternative.id)
    if ("error" in result) setError(result.error)
    setPending(false)
  }

  return (
    <div className="rounded-xl border border-brand-border bg-white p-4 shadow-bevel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-text-primary">{alternative.alternative_spec}</p>
          <p className="text-xs text-brand-text-secondary">IS {alternative.indian_standard_code}</p>
        </div>
        <span className="rounded bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-text-secondary">
          {alternative.status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-brand-text-secondary">
        <div>
          <dt>Unit cost</dt>
          <dd className="font-medium text-brand-text-primary">
            {alternative.alternative_unit_cost == null ? "—" : formatInr(alternative.alternative_unit_cost)}
          </dd>
        </div>
        <div>
          <dt>Savings</dt>
          <dd className="font-medium text-brand-green">
            {alternative.savings_percentage == null ? "—" : `${alternative.savings_percentage.toFixed(1)}%`}
          </dd>
        </div>
        <div>
          <dt>Lead time</dt>
          <dd>{alternative.lead_time_days == null ? "—" : `${alternative.lead_time_days} days`}</dd>
        </div>
        <div>
          <dt>AIS</dt>
          <dd>{alternative.is_ais_compliant ? "Compliant" : "No"}</dd>
        </div>
      </dl>
      {canAccept ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pending || alternative.status === "ACCEPTED"}
            onClick={() => void run("accept")}
            className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={pending || alternative.status === "REJECTED"}
            onClick={() => void run("reject")}
            className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-semibold text-brand-text-primary disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs font-medium text-brand-red">{error}</p> : null}
    </div>
  )
}

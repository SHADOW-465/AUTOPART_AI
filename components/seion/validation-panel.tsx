"use client"

import { useState } from "react"
import { runValidationAction } from "@/lib/actions/validation"
import type { TechnicalValidation, ValidationRecommendation } from "@/lib/db/types"
import type { ValidationReport } from "@/lib/groq/validate"

function badgeClass(rec: ValidationRecommendation): string {
  if (rec === "SAFE_TO_SWITCH") return "bg-green-50 text-brand-green"
  if (rec === "REQUIRES_TESTING") return "bg-amber-50 text-amber-800"
  return "bg-red-50 text-brand-red"
}

export function ValidationPanel({
  alternativeId,
  canValidate,
  latest,
}: {
  alternativeId: string
  canValidate: boolean
  latest: TechnicalValidation | null
}) {
  const [report, setReport] = useState<ValidationReport | null>(
    latest
      ? {
          material_composition_result: latest.material_composition_result,
          mechanical_properties_result: latest.mechanical_properties_result,
          dimensional_fit_result: latest.dimensional_fit_result,
          recommendation: latest.recommendation,
          summary_markdown: latest.validation_summary_markdown,
        }
      : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run() {
    setPending(true)
    setError(null)
    const result = await runValidationAction(alternativeId)
    if ("error" in result) setError(result.error)
    else setReport(result.report)
    setPending(false)
  }

  return (
    <div className="mt-3 space-y-2 border-t border-brand-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-brand-text-primary">Metallurgy validation</p>
        {canValidate ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void run()}
            className="rounded-lg border border-brand-border px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
          >
            {pending ? "Validating…" : "Validate"}
          </button>
        ) : null}
      </div>
      {report ? (
        <>
          <span
            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass(report.recommendation)}`}
          >
            {report.recommendation.replaceAll("_", " ")}
          </span>
          <div className="whitespace-pre-wrap text-xs text-brand-text-secondary">{report.summary_markdown}</div>
        </>
      ) : (
        <p className="text-xs text-brand-text-secondary">No validation yet.</p>
      )}
      {error ? <p className="text-xs font-medium text-brand-red">{error}</p> : null}
    </div>
  )
}

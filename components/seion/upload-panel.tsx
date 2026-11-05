"use client"

import { useActionState, useRef, useState } from "react"
import { Download, FileUp, Sparkles } from "lucide-react"
import { loadSampleBomAction, uploadBomAction } from "@/lib/actions/boms"
import { cn } from "@/lib/utils"
import { ActionButton, FormMessage, SubmitButton } from "./client"
import { buttonClass, Field, inputClass } from "./ui"

const MAX_BYTES = 4 * 1024 * 1024

export function UploadPanel({ defaultAnnualVolume, compact = false }: { defaultAnnualVolume: number; compact?: boolean }) {
  const [serverState, formAction] = useActionState(uploadBomAction, null)
  const [localError, setLocalError] = useState<string | null>(null)
  const state = localError ? { error: localError } : serverState
  const pick = (file: File | undefined) => {
    setFileName(file?.name ?? null)
    setLocalError(file && file.size > MAX_BYTES ? "File must be 4 MB or smaller. Export just the BOM table as CSV or .xlsx." : null)
  }
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (localError) e.preventDefault()
      }}
      className="space-y-3"
    >
      <label
        htmlFor="bom-file"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const files = e.dataTransfer.files
          if (files.length && inputRef.current) {
            inputRef.current.files = files
            pick(files[0])
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 text-center transition-colors",
          compact ? "py-5" : "py-8",
          dragging ? "border-brand-blue bg-blue-50" : "border-brand-border bg-gray-50/60 hover:border-brand-blue/50",
        )}
      >
        <FileUp className="h-6 w-6 text-brand-blue" aria-hidden />
        <span className="text-sm font-semibold text-brand-text-primary">
          {fileName ?? "Drop a BOM here or click to choose"}
        </span>
        <span className="text-xs text-brand-text-secondary">.xlsx, .csv or text-based .pdf · up to 4 MB</span>
        <input
          ref={inputRef}
          id="bom-file"
          name="file"
          type="file"
          required
          accept=".xlsx,.csv,.tsv,.txt,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer (optional)" htmlFor="customer_name">
          <input id="customer_name" name="customer_name" className={inputClass} placeholder="e.g. OEM name" />
        </Field>
        <Field label="Annual vehicle volume" htmlFor="annual_volume" hint="Used for annual savings. Editable later.">
          <input id="annual_volume" name="annual_volume" inputMode="numeric" className={inputClass} defaultValue={defaultAnnualVolume} />
        </Field>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingText="Analysing…">Upload &amp; analyse</SubmitButton>
        <ActionButton action={loadSampleBomAction} size="md" title="Loads a 13-line sample BOM to try every feature">
          <Sparkles className="h-4 w-4" aria-hidden /> Try the sample BOM
        </ActionButton>
        <a href="/samples/bom-template.csv" download className={buttonClass("ghost", "md")}>
          <Download className="h-4 w-4" aria-hidden /> BOM template
        </a>
      </div>
    </form>
  )
}

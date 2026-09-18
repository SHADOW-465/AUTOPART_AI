"use client"

import { useRef, useState } from "react"
import { uploadBomAction } from "@/lib/actions/boms"
import { Spinner } from "@/components/ui/spinner"

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(file: File) {
    setPending(true)
    setError(null)
    const formData = new FormData()
    formData.set("file", file)
    try {
      const result = await uploadBomAction(formData)
      if (result && "error" in result) {
        setError(result.error)
        setPending(false)
      }
    } catch {
      setError("Upload failed")
      setPending(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-brand-border bg-white p-8 shadow-bevel">
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept=".xlsx,.csv,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void submit(file)
          e.target.value = ""
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files?.[0]
          if (file) void submit(file)
        }}
        className="flex w-full flex-col items-center justify-center gap-2 py-6 text-center disabled:opacity-70"
      >
        {pending ? (
          <>
            <Spinner className="size-6 text-brand-blue" />
            <p className="text-sm font-medium text-brand-text-primary">Extracting parts…</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-brand-text-primary">Drop a BOM file here</p>
            <p className="text-xs text-brand-text-secondary">xlsx, csv, or PDF. Max 10MB.</p>
          </>
        )}
      </button>
      {error ? <p className="mt-2 text-center text-sm font-medium text-brand-red">{error}</p> : null}
    </div>
  )
}

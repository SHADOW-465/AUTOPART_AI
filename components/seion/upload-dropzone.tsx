"use client"

import { useRef, useState } from "react"
import { uploadBomAction } from "@/lib/actions/boms"
import { Loader2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

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
    <div
      className={cn(
        "rounded-xl border-2 border-dashed bg-white p-6 shadow-bevel transition-colors",
        dragging ? "border-brand-blue bg-blue-50" : "border-brand-border",
      )}
    >
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
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void submit(file)
        }}
        className="flex w-full flex-col items-center justify-center gap-2 py-6 text-center disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 role="status" aria-label="Processing" className="size-6 animate-spin text-brand-blue" />
            <p className="text-sm font-medium text-brand-text-primary">Extracting and matching parts…</p>
            <p className="text-xs text-brand-text-secondary">Large BOMs can take a minute. Keep this tab open.</p>
          </>
        ) : (
          <>
            <Upload className="size-6 text-brand-blue" />
            <p className="text-sm font-semibold text-brand-text-primary">Drop a BOM file here, or click to choose</p>
            <p className="text-xs text-brand-text-secondary">xlsx, csv, or PDF. Max 10MB.</p>
          </>
        )}
      </button>
      {error ? <p className="mt-2 text-center text-sm font-medium text-brand-red">{error}</p> : null}
    </div>
  )
}

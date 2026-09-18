"use client"

import { useState } from "react"
import { retryBomAction } from "@/lib/actions/alternatives"

export function RetryBomButton({ bomId }: { bomId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError(null)
          const result = await retryBomAction(bomId)
          if ("error" in result) setError(result.error)
          setPending(false)
        }}
        className="rounded-lg border border-brand-border bg-white px-3 py-1 text-xs font-semibold text-brand-text-primary disabled:opacity-50"
      >
        {pending ? "Retrying…" : "Retry"}
      </button>
      {error ? <p className="mt-1 text-xs text-brand-red">{error}</p> : null}
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { buttonClass } from "@/components/seion/ui"

export default function WorkbenchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-brand-red">
      <p className="font-semibold">Something went wrong loading this page.</p>
      <p className="mt-1 text-red-800">Try again. If it keeps happening, check the server logs{error.digest ? ` for error ${error.digest}` : ""}.</p>
      <button type="button" onClick={reset} className={buttonClass("secondary", "sm", "mt-4")}>
        Try again
      </button>
    </div>
  )
}

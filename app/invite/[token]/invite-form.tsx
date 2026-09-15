"use client"

import { useState } from "react"
import { acceptInviteAction } from "@/lib/actions/auth"

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    const fullName = String(formData.get("fullName") ?? "")
    const password = String(formData.get("password") ?? "")
    const confirm = String(formData.get("confirmPassword") ?? "")
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    setPending(true)
    setError(null)
    const result = await acceptInviteAction(token, fullName, password)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-brand-text-primary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          readOnly
          className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 text-sm text-brand-text-secondary"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium text-brand-text-primary">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-brand-text-primary">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-brand-text-primary">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        />
      </div>
      {error ? <p className="text-sm font-medium text-brand-red">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-brand-blueHover disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  )
}

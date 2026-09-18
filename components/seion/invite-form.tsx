"use client"

import { useState } from "react"
import { Copy } from "lucide-react"
import { createInviteAction } from "@/lib/actions/invites"
import type { Role } from "@/lib/auth/roles"

const ROLES: { value: Role; label: string }[] = [
  { value: "plant_admin", label: "Plant admin" },
  { value: "procurement_engineer", label: "Procurement engineer" },
  { value: "quality_manager", label: "Quality manager" },
]

export function InviteForm() {
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    setCopied(false)
    const result = await createInviteAction(
      String(formData.get("email") ?? ""),
      String(formData.get("role") ?? "") as Role,
    )
    setPending(false)
    if ("error" in result) {
      setError(result.error)
      setInviteUrl(null)
      return
    }
    setInviteUrl(result.inviteUrl)
  }

  async function copyUrl() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="invite-email" className="text-sm font-medium text-brand-text-primary">
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invite-role" className="text-sm font-medium text-brand-text-primary">
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            required
            defaultValue="procurement_engineer"
            className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm text-brand-text-primary outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? <p className="text-sm font-medium text-brand-red">{error}</p> : null}
      {inviteUrl ? (
        <div className="space-y-1.5">
          <label htmlFor="invite-url" className="text-sm font-medium text-brand-text-primary">
            Invite URL
          </label>
          <div className="flex gap-2">
            <input
              id="invite-url"
              readOnly
              value={inviteUrl}
              className="h-10 min-w-0 flex-1 rounded-lg border border-brand-border bg-gray-50 px-3 text-sm text-brand-text-primary"
            />
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-brand-border px-3 text-sm font-medium text-brand-text-primary hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blueHover disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
    </form>
  )
}

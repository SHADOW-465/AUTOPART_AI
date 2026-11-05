import { LogOut } from "lucide-react"
import { AppNav } from "@/components/seion/app-nav"
import { Logo } from "@/components/seion/logo"
import { signOutAction } from "@/lib/actions/auth"
import { roleLabel } from "@/lib/auth/roles"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function AppShell({
  children,
  fullName,
  role,
  showUsers,
}: {
  children: React.ReactNode
  fullName: string
  role: string
  showUsers: boolean
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-brand-surface">
      <aside className="hidden w-[240px] flex-shrink-0 flex-col border-r border-brand-border md:flex">
        <div className="flex h-16 items-center border-b border-brand-border bg-white px-6">
          <Logo />
        </div>
        <AppNav showUsers={showUsers} variant="sidebar" />
      </aside>
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-brand-border bg-white px-4 md:justify-end md:px-8">
          <Logo className="md:hidden" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-bold text-brand-text-primary">{fullName}</p>
              <p className="text-[11px] text-brand-text-secondary">{roleLabel(role)}</p>
            </div>
            <div
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-bold text-white"
            >
              {initials(fullName)}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Sign out"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-border px-3 text-sm font-medium text-brand-text-secondary hover:bg-gray-50 hover:text-brand-text-primary"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </header>
        <div className="md:hidden">
          <AppNav showUsers={showUsers} variant="bar" />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

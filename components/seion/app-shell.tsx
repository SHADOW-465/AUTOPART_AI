import { Logo } from "@/components/seion/logo"
import { AppNav } from "@/components/seion/app-nav"

function humanizeRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

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
    <div className="flex h-screen overflow-hidden bg-brand-surface font-sans">
      <aside className="relative z-20 hidden w-[250px] flex-shrink-0 flex-col border-r border-brand-border bg-brand-surface md:flex">
        <div className="flex h-16 items-center border-b border-brand-border bg-white px-6">
          <Logo />
        </div>
        <AppNav showUsers={showUsers} />
        <div className="border-t border-brand-border p-4 text-center text-[10px] text-gray-400">
          v1.0 Beta | SEION Digital
        </div>
      </aside>
      <div className="relative flex h-full flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-16 flex-shrink-0 items-center justify-end border-b border-brand-border bg-white px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="hidden leading-tight md:block md:text-right">
              <p className="text-sm font-bold text-brand-text-primary">{fullName}</p>
              <p className="text-[11px] text-brand-text-secondary">{humanizeRole(role)}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-bold text-white ring-2 ring-gray-100">
              {initials(fullName)}
            </div>
          </div>
        </header>
        <main className="relative flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  )
}

import Link from "next/link"
import { AppNav } from "@/components/seion/app-nav"
import { Logo } from "@/components/seion/logo"

export function AppShell({
  children,
  companyName,
  plantLocation,
  openRfqs,
}: {
  children: React.ReactNode
  companyName: string
  plantLocation: string
  openRfqs: number
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-brand-surface">
      <aside className="hidden w-[220px] flex-shrink-0 flex-col border-r border-brand-border bg-white md:flex">
        <Link href="/" className="flex h-16 items-center border-b border-brand-border px-5">
          <Logo />
        </Link>
        <AppNav variant="sidebar" openRfqs={openRfqs} />
        <p className="border-t border-brand-border px-5 py-3 text-[11px] leading-snug text-brand-text-secondary">
          Engineering matches come from your standards library, not AI.
        </p>
      </aside>
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-brand-border bg-white px-4 md:h-16 md:justify-end md:px-8">
          <Link href="/" className="md:hidden">
            <Logo />
          </Link>
          {companyName ? (
            <Link href="/settings" className="min-w-0 text-right leading-tight">
              <span className="block truncate text-sm font-bold text-brand-text-primary">{companyName}</span>
              {plantLocation ? <span className="block truncate text-[11px] text-brand-text-secondary">{plantLocation}</span> : null}
            </Link>
          ) : (
            <Link href="/settings" className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
              Set up your plant details →
            </Link>
          )}
        </header>
        <div className="md:hidden">
          <AppNav variant="bar" openRfqs={openRfqs} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-[1400px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

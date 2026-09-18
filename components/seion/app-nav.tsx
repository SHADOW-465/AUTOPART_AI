"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Home, Settings, TrendingUp, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/app", label: "Dashboard", icon: Home, match: (p: string) => p === "/app" },
  { href: "/app/boms", label: "BOMs", icon: FileText, match: (p: string) => p.startsWith("/app/boms") },
  { href: "/app/savings", label: "Savings", icon: TrendingUp, match: (p: string) => p.startsWith("/app/savings") },
  {
    href: "/app/settings/standards",
    label: "Standards",
    icon: Settings,
    match: (p: string) => p.startsWith("/app/settings/standards"),
  },
] as const

export function AppNav({ showUsers }: { showUsers: boolean }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col space-y-1 overflow-y-auto px-4 py-6">
      {items.map((item) => {
        const active = item.match(pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-medium transition-all",
              active
                ? "border-brand-blue bg-blue-50 text-brand-blue"
                : "border-transparent text-brand-text-secondary hover:bg-gray-100 hover:text-brand-text-primary",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-blue" : "text-gray-400")} />
            {item.label}
          </Link>
        )
      })}
      {showUsers ? (
        <Link
          href="/app/settings/users"
          className={cn(
            "flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-medium transition-all",
            pathname.startsWith("/app/settings/users")
              ? "border-brand-blue bg-blue-50 text-brand-blue"
              : "border-transparent text-brand-text-secondary hover:bg-gray-100 hover:text-brand-text-primary",
          )}
        >
          <Users
            className={cn(
              "h-[18px] w-[18px]",
              pathname.startsWith("/app/settings/users") ? "text-brand-blue" : "text-gray-400",
            )}
          />
          Users
        </Link>
      ) : null}
    </nav>
  )
}

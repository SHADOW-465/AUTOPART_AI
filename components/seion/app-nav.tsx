"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, FileText, Home, TrendingUp, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const baseItems = [
  { href: "/app", label: "Dashboard", icon: Home, exact: true },
  { href: "/app/boms", label: "BOMs", icon: FileText, exact: false },
  { href: "/app/savings", label: "Savings", icon: TrendingUp, exact: false },
  { href: "/app/settings/standards", label: "Standards", icon: BookOpen, exact: false },
]

const usersItem = { href: "/app/settings/users", label: "Users", icon: Users, exact: false }

export function AppNav({ showUsers, variant }: { showUsers: boolean; variant: "sidebar" | "bar" }) {
  const pathname = usePathname()
  const items = showUsers ? [...baseItems, usersItem] : baseItems

  return (
    <nav
      aria-label="Main"
      className={cn(
        variant === "sidebar"
          ? "flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6"
          : "flex gap-1 overflow-x-auto border-b border-brand-border bg-white px-2 py-2",
      )}
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg text-sm font-medium transition-colors",
              variant === "sidebar" ? "border-l-4 px-4 py-3" : "px-3 py-2",
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
    </nav>
  )
}

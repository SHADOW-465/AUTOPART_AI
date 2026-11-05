"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Factory, FileSpreadsheet, Home, Mail, Settings, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/boms", label: "BOMs", icon: FileSpreadsheet },
  { href: "/rfqs", label: "RFQs", icon: Mail },
  { href: "/suppliers", label: "Suppliers", icon: Factory },
  { href: "/standards", label: "Standards", icon: BookOpen },
  { href: "/savings", label: "Savings", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppNav({ variant, openRfqs }: { variant: "sidebar" | "bar"; openRfqs: number }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className={cn(
        variant === "sidebar"
          ? "flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
          : "flex gap-1 overflow-x-auto border-b border-brand-border bg-white px-2 py-2",
      )}
    >
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg text-sm font-medium transition-colors",
              variant === "sidebar" ? "px-3 py-2.5" : "px-3 py-2",
              active ? "bg-blue-50 text-brand-blue" : "text-brand-text-secondary hover:bg-gray-100 hover:text-brand-text-primary",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-blue" : "text-gray-400")} aria-hidden />
            {item.label}
            {item.href === "/rfqs" && openRfqs > 0 ? (
              <span className="ml-auto rounded-full bg-brand-blue px-1.5 text-[10px] font-bold text-white" aria-label={`${openRfqs} open`}>
                {openRfqs}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

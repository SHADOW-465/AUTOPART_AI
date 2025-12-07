"use client"

import type React from "react"

import { Logo } from "@/components/logo"
import { LucideIcon } from "@/components/lucide-icon"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function DashboardLayout({ children, activeTab, setActiveTab }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-brand-surface overflow-hidden font-sans">
      {/* Sidebar (Fixed Left) */}
      <aside className="w-[250px] bg-brand-surface border-r border-brand-border flex flex-col flex-shrink-0 z-20 relative hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-brand-border bg-white">
          <Logo />
        </div>

        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: "home" },
            { id: "results", label: "My BOMs", icon: "fileText" },
            { id: "savings", label: "Savings Tracker", icon: "trendingUp" },
            { id: "settings", label: "Standards Lib", icon: "settings" },
            { id: "support", label: "Support", icon: "phone" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                activeTab === item.id
                  ? "bg-blue-50 text-brand-blue border-l-4 border-brand-blue"
                  : "text-brand-text-secondary hover:bg-gray-100 hover:text-brand-text-primary border-l-4 border-transparent"
              }`}
            >
              <LucideIcon
                name={item.icon}
                size={18}
                className={activeTab === item.id ? "text-brand-blue" : "text-gray-400"}
              />
              <span>{item.label}</span>
            </button>
          ))}

          <div className="pt-6 mt-6 border-t border-brand-border">
            <button className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-sm rounded border border-amber-200 transition">
              🎁 Upgrade to Pro
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-brand-border text-[10px] text-gray-400 text-center">
          v1.0 Beta | SEION Digital
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar (Sticky) */}
        <header className="h-16 bg-white border-b border-brand-border flex items-center justify-between px-8 flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-brand-text-primary tracking-tight">
              {activeTab === "dashboard"
                ? "Dashboard"
                : activeTab === "results"
                  ? "BOM Results"
                  : activeTab === "savings"
                    ? "Savings Tracker"
                    : activeTab === "settings"
                      ? "Standards Library"
                      : "Support"}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-brand-blue transition">
              <LucideIcon name="bell" size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-red rounded-full border border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-brand-border">
              <div className="text-right hidden md:block leading-tight">
                <p className="text-sm font-bold text-brand-text-primary">Rajesh Kumar</p>
                <p className="text-[11px] text-brand-text-secondary">Ops Manager</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold text-sm ring-2 ring-gray-100">
                RK
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">{children}</main>
      </div>
    </div>
  )
}

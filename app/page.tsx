"use client"

import { useState } from "react"
import { LandingPage } from "@/components/landing-page"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardView } from "@/components/dashboard-view"
import { ResultsView } from "@/components/results-view"
import { SavingsView } from "@/components/savings-view"

export default function Home() {
  const [view, setView] = useState<"landing" | "app">("landing")
  const [activeTab, setActiveTab] = useState("dashboard")
  const [processing, setProcessing] = useState(false)

  const handleStart = () => setView("app")

  const handleUpload = () => {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setActiveTab("results")
    }, 3000)
  }

  if (view === "landing") {
    return <LandingPage onStart={handleStart} />
  }

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "dashboard" && <DashboardView onUpload={handleUpload} processing={processing} />}
      {activeTab === "results" && <ResultsView />}
      {activeTab === "savings" && <SavingsView />}
      {activeTab === "settings" && (
        <div className="bg-white p-10 rounded-xl border border-brand-border shadow-bevel flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <span className="text-4xl mb-4 block">⚙️</span>
            <h3 className="text-xl font-bold text-brand-text-primary">Standards Library</h3>
            <p className="text-brand-text-secondary">DIN, IS, USCAR standards database coming in Phase 2.</p>
          </div>
        </div>
      )}
      {activeTab === "support" && (
        <div className="bg-white p-10 rounded-xl border border-brand-border shadow-bevel flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <span className="text-4xl mb-4 block">📞</span>
            <h3 className="text-xl font-bold text-brand-text-primary">Support Center</h3>
            <p className="text-brand-text-secondary">Contact support@seion.ai for assistance.</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

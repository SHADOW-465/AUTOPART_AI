"use client"

import { LucideIcon } from "@/components/lucide-icon"

interface DashboardViewProps {
  onUpload: () => void
  processing: boolean
}

export function DashboardView({ onUpload, processing }: DashboardViewProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Center Column: Upload Zone */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <div className="bg-white p-8 rounded-xl shadow-bevel border border-brand-border flex flex-col items-center justify-center text-center h-[400px] transition-all hover:shadow-bevel-hover">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-brand-text-primary mb-2">Upload Your BOM</h3>
            <p className="text-brand-text-secondary">PDF, Excel, or STEP files. Max 10MB.</p>
          </div>

          <div
            className={`w-full max-w-lg h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-all duration-300 cursor-pointer group relative overflow-hidden
            ${processing ? "border-brand-blue bg-blue-50" : "border-gray-300 hover:border-brand-blue hover:bg-blue-50"}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              onUpload()
            }}
            onClick={!processing ? onUpload : undefined}
          >
            {processing ? (
              <div className="z-10">
                <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-brand-blue font-bold text-sm">Extracting parts with Gemini AI...</p>
                <p className="text-xs text-brand-text-tertiary mt-1">Analyzing BOM structure...</p>
              </div>
            ) : (
              <div className="z-10 flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 text-brand-blue rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <LucideIcon name="upload" size={24} />
                </div>
                <p className="text-brand-text-primary font-bold mb-1">Drag your BOM here</p>
                <p className="text-xs text-brand-text-tertiary">or click to browse</p>
                <button className="mt-4 px-6 py-2 bg-white border border-brand-border text-brand-text-primary text-sm font-medium rounded hover:bg-gray-50 shadow-sm">
                  Select File
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-bevel border border-brand-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-brand-text-primary">Recent Activity</h4>
            <button className="text-xs text-brand-blue hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {[
              { name: "Engine_Mount_v3.pdf", time: "2 hours ago", status: "Completed" },
              { name: "Transmission_BOM.xlsx", time: "5 hours ago", status: "Completed" },
              { name: "Chassis_Parts_Q4.pdf", time: "Yesterday", status: "Completed" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 text-brand-blue flex items-center justify-center font-bold text-xs">
                    {item.name.endsWith(".pdf") ? "PDF" : "XLS"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-text-primary">{item.name}</p>
                    <p className="text-xs text-brand-text-tertiary">{item.time}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-brand-green bg-green-50 px-2 py-1 rounded border border-green-100 uppercase">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: KPI Metrics */}
      <div className="w-full lg:w-[320px] flex flex-col gap-4 flex-shrink-0">
        {[
          {
            label: "Monthly Savings",
            value: "₹2,34,500",
            sub: "This month",
            trend: "↑ 12%",
            trendColor: "text-brand-green",
            color: "text-brand-red",
          },
          { label: "BOMs Processed", value: "127", sub: "Total (3 today)", trend: "", color: "text-brand-blue" },
          {
            label: "Compliance Rate",
            value: "98.7%",
            sub: "AIS Verified",
            trend: "",
            color: "text-brand-green",
            icon: "checkCircle",
          },
          {
            label: "Time Saved",
            value: "42 hrs",
            sub: "This month",
            trend: "",
            color: "text-brand-dark",
            icon: "clock",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-lg border border-brand-border shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">{kpi.label}</p>
              {kpi.icon && <LucideIcon name={kpi.icon} size={16} className={kpi.color} />}
            </div>
            <p className={`text-2xl font-bold ${kpi.color} tracking-tight`}>{kpi.value}</p>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-brand-text-tertiary">{kpi.sub}</p>
              {kpi.trend && <p className={`text-xs font-bold ${kpi.trendColor}`}>{kpi.trend}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

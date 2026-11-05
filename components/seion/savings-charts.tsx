"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { inr, inrShort } from "@/lib/format"

// Validated with the dataviz palette checker (light surface): all checks pass.
// Tritan separation sits in the floor band, so identity is also carried by the legend, the bar gap and the table view.
export const SERIES = [
  { key: "proposed", label: "Proposed (plant-accepted)", color: "#2563eb" },
  { key: "approved", label: "Customer-approved", color: "#059669" },
] as const

const axisTick = { fill: "#64748b", fontSize: 11 }

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-brand-text-secondary">
      {SERIES.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

function TooltipBody({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-brand-border bg-white px-3 py-2 text-xs shadow-bevel">
      <p className="mb-1 font-semibold text-brand-text-primary">{label}</p>
      {SERIES.map((s) => {
        const value = payload.find((p) => p.dataKey === s.key)?.value ?? 0
        return (
          <p key={s.key} className="flex items-center gap-1.5 text-brand-text-secondary">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
            {s.label}: <span className="font-semibold text-brand-text-primary">{inr(value, 0)}</span>
          </p>
        )
      })}
    </div>
  )
}

export function MonthlySavingsChart({ data }: { data: { label: string; proposed: number; approved: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="30%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eef2f6" />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => inrShort(v)} width={72} />
          <Tooltip content={<TooltipBody />} cursor={{ fill: "rgba(100,116,139,0.08)" }} />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategorySavingsChart({ data }: { data: { label: string; proposed: number; approved: number }[] }) {
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 56 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="#eef2f6" />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => inrShort(v)} />
          <YAxis type="category" dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} width={110} />
          <Tooltip content={<TooltipBody />} cursor={{ fill: "rgba(100,116,139,0.08)" }} />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

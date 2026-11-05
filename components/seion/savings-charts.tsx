"use client"

import {
  CartesianGrid,
  Cell,
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatInr } from "@/lib/boms/kpis"

const COLORS = ["#1E3A8A", "#DC2626", "#059669", "#D97706", "#7C3AED"]

export function SavingsCharts({
  monthly,
  byCategory,
}: {
  monthly: { name: string; savings: number }[]
  byCategory: { name: string; value: number }[]
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <h3 className="mb-6 text-lg font-bold text-brand-text-primary">Savings by month</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 12 }} tickFormatter={(v) => formatInr(Number(v))} width={80} />
            <Tooltip
              formatter={(value) => [formatInr(Number(value)), "Savings"]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
            />
            <Bar dataKey="savings" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <h3 className="mb-6 text-lg font-bold text-brand-text-primary">Savings by category</h3>
        {byCategory.length === 0 ? (
          <p className="text-sm text-brand-text-secondary">No category data.</p>
        ) : (
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {byCategory.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatInr(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {byCategory.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-brand-text-primary">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-brand-text-secondary">{formatInr(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

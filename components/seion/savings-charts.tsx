"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

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
        <h3 className="mb-6 text-lg font-bold text-brand-text-primary">Monthly Savings Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
            <Line type="monotone" dataKey="savings" stroke="#1E3A8A" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
        <h3 className="mb-6 text-lg font-bold text-brand-text-primary">Savings by Category</h3>
        {byCategory.length === 0 ? null : (
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {byCategory.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {byCategory.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-brand-text-primary">{item.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel lg:col-span-2">
        <h3 className="mb-6 text-lg font-bold text-brand-text-primary">Savings by month</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="savings" fill="#059669" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

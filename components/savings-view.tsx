"use client"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"

const SAVINGS_DATA = [
  { name: "Jan", savings: 0 },
  { name: "Feb", savings: 45000 },
  { name: "Mar", savings: 82000 },
  { name: "Apr", savings: 125000 },
  { name: "May", savings: 180000 },
  { name: "Jun", savings: 234500 },
]

const CATEGORY_DATA = [
  { name: "Fasteners", value: 42, color: "#1E3A8A" },
  { name: "Electronics", value: 28, color: "#DC2626" },
  { name: "Rubber", value: 18, color: "#059669" },
  { name: "Chassis", value: 12, color: "#D97706" },
]

const MONTHLY_BREAKDOWN = [
  { month: "Jan", original: 500000, optimized: 500000 },
  { month: "Feb", original: 520000, optimized: 475000 },
  { month: "Mar", original: 480000, optimized: 398000 },
  { month: "Apr", original: 550000, optimized: 425000 },
  { month: "May", original: 600000, optimized: 420000 },
  { month: "Jun", original: 580000, optimized: 345500 },
]

export function SavingsView() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-brand-red to-red-700 p-6 rounded-xl text-white shadow-lg">
          <p className="text-red-200 text-xs font-bold uppercase tracking-wider mb-2">Total Savings (YTD)</p>
          <p className="text-4xl font-bold tracking-tight">₹6,66,500</p>
          <p className="text-red-200 text-sm mt-2">↑ 34% vs last year</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-bevel">
          <p className="text-brand-text-secondary text-xs font-bold uppercase tracking-wider mb-2">
            Avg Monthly Savings
          </p>
          <p className="text-3xl font-bold text-brand-blue tracking-tight">₹1,11,083</p>
          <p className="text-brand-green text-sm mt-2 font-medium">↑ 12% this month</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-bevel">
          <p className="text-brand-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Parts Optimized</p>
          <p className="text-3xl font-bold text-brand-dark tracking-tight">847</p>
          <p className="text-brand-text-tertiary text-sm mt-2">Across 127 BOMs</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-bevel">
          <p className="text-brand-text-secondary text-xs font-bold uppercase tracking-wider mb-2">ROI Period</p>
          <p className="text-3xl font-bold text-brand-green tracking-tight">12 days</p>
          <p className="text-brand-text-tertiary text-sm mt-2">Payback achieved</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Line Chart - Savings Trend */}
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-bevel">
          <h3 className="text-lg font-bold text-brand-text-primary mb-6">Monthly Savings Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={SAVINGS_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 12 }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number) => [`₹${value.toLocaleString()}`, "Savings"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
              />
              <Line
                type="monotone"
                dataKey="savings"
                stroke="#1E3A8A"
                strokeWidth={3}
                dot={{ fill: "#1E3A8A", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Category Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-bevel">
          <h3 className="text-lg font-bold text-brand-text-primary mb-6">Savings by Category</h3>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {CATEGORY_DATA.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-brand-text-primary">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-brand-text-primary">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart - Monthly Comparison */}
      <div className="bg-white p-6 rounded-xl border border-brand-border shadow-bevel">
        <h3 className="text-lg font-bold text-brand-text-primary mb-6">Original vs Optimized BOM Cost</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={MONTHLY_BREAKDOWN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 12 }}
              tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
            />
            <Tooltip
              formatter={(value: number) => [`₹${value.toLocaleString()}`, ""]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
            />
            <Bar dataKey="original" fill="#FCA5A5" name="Original Cost" radius={[4, 4, 0, 0]} />
            <Bar dataKey="optimized" fill="#059669" name="Optimized Cost" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-300"></div>
            <span className="text-sm text-brand-text-secondary">Original Cost</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-brand-green"></div>
            <span className="text-sm text-brand-text-secondary">Optimized Cost</span>
          </div>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="bg-gradient-to-br from-brand-blue to-blue-700 p-8 rounded-xl text-white shadow-lg">
        <h3 className="text-xl font-bold mb-6">ROI Calculator</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase mb-2">Original BOM Cost</p>
            <p className="text-2xl font-bold">₹5,00,000</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase mb-2">SEION Optimized</p>
            <p className="text-2xl font-bold">₹3,45,500</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase mb-2">Monthly Savings</p>
            <p className="text-2xl font-bold text-green-300">₹1,54,500</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase mb-2">Payback Period</p>
            <p className="text-2xl font-bold text-yellow-300">12 days ✓</p>
          </div>
        </div>
      </div>
    </div>
  )
}

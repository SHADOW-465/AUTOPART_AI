"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { LineView } from "@/lib/boms/view"
import { inr, num } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CustomerBadge, MatchBadge, RecommendationBadge } from "./badges"
import { LinePanel, type SupplierOption } from "./line-panel"
import { EmptyState } from "./ui"

type Filter = "all" | "review" | "matched" | "accepted" | "awaiting"

const FILTERS: { id: Filter; label: string; test: (l: LineView) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "review", label: "Needs review", test: (l) => l.item.match_status === "NEEDS_REVIEW" },
  { id: "matched", label: "IS match", test: (l) => l.item.match_status === "MATCHED" },
  { id: "accepted", label: "Accepted", test: (l) => l.accepted != null },
  {
    id: "awaiting",
    label: "Awaiting customer",
    test: (l) => l.accepted != null && (l.accepted.customer_status === "NOT_SUBMITTED" || l.accepted.customer_status === "SUBMITTED"),
  },
]

export function BomWorkbench({
  lines,
  annualVolume,
  suppliers,
  initialLineId,
}: {
  lines: LineView[]
  annualVolume: number
  suppliers: SupplierOption[]
  initialLineId?: string
}) {
  const [filter, setFilter] = useState<Filter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(
    lines.find((l) => l.item.id === initialLineId)?.item.id ?? lines[0]?.item.id ?? null,
  )
  const panelRef = useRef<HTMLDivElement>(null)
  const visible = useMemo(() => lines.filter(FILTERS.find((f) => f.id === filter)!.test), [lines, filter])
  const selected = lines.find((l) => l.item.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId) return
    const url = new URL(window.location.href)
    url.searchParams.set("line", selectedId)
    window.history.replaceState(null, "", url)
  }, [selectedId])

  if (lines.length === 0) return <EmptyState title="No lines in this BOM" />

  const select = (id: string) => {
    setSelectedId(id)
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
      <div className="min-w-0 rounded-xl border border-brand-border bg-white shadow-bevel">
        <div className="flex gap-1 overflow-x-auto border-b border-brand-border p-2" role="tablist" aria-label="Filter lines">
          {FILTERS.map((f) => {
            const count = lines.filter(f.test).length
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                  filter === f.id ? "bg-brand-blue text-white" : "text-brand-text-secondary hover:bg-gray-100",
                )}
              >
                {f.label} <span className="opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-brand-border bg-gray-50 text-[11px] uppercase tracking-wide text-brand-text-secondary">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Part</th>
                <th className="px-3 py-2 font-semibold">Customer spec</th>
                <th className="px-3 py-2 font-semibold">Qty</th>
                <th className="px-3 py-2 font-semibold">Current</th>
                <th className="px-3 py-2 font-semibold">Indian Standard</th>
                <th className="px-3 py-2 font-semibold">Best / accepted</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((line) => {
                const { item } = line
                const shown = line.accepted ?? line.alternatives.find((a) => a.status !== "REJECTED" && a.unit_cost != null) ?? null
                const active = item.id === selectedId
                return (
                  <tr
                    key={item.id}
                    onClick={() => select(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        select(item.id)
                      }
                    }}
                    tabIndex={0}
                    aria-selected={active}
                    className={cn("cursor-pointer border-b border-brand-border last:border-0 outline-none focus-visible:bg-blue-50", active ? "bg-blue-50" : "hover:bg-gray-50")}
                  >
                    <td className="px-3 py-2 text-brand-text-secondary">{item.line_number}</td>
                    <td className="max-w-[220px] px-3 py-2">
                      <p className="truncate font-medium text-brand-text-primary">{item.part_name || "—"}</p>
                      <p className="truncate text-xs text-brand-text-secondary">{item.part_number}</p>
                    </td>
                    <td className="max-w-[200px] px-3 py-2 text-xs text-brand-text-secondary">
                      <span className="line-clamp-2">{item.original_spec || "—"}</span>
                    </td>
                    <td className="px-3 py-2">{num(item.quantity)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{inr(item.current_unit_cost)}</td>
                    <td className="px-3 py-2">
                      {line.toSpec ? (
                        <>
                          <p className="whitespace-nowrap font-medium text-brand-text-primary">{line.toSpec.code}</p>
                          {line.validation ? <RecommendationBadge value={line.validation.recommendation} /> : null}
                        </>
                      ) : (
                        <MatchBadge status={item.match_status} />
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {shown?.unit_cost != null ? (
                        <>
                          <p className="font-medium">{inr(shown.unit_cost)}</p>
                          {shown.delta.annual != null ? (
                            <p className={cn("text-xs", shown.delta.annual < 0 ? "text-brand-red" : "text-brand-green")}>{inr(shown.delta.annual, 0)}/yr</p>
                          ) : null}
                        </>
                      ) : line.toSpec ? (
                        <span className="text-xs text-brand-text-secondary">Needs quote</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">{line.accepted ? <CustomerBadge status={line.accepted.customer_status} /> : null}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visible.length === 0 ? <p className="p-4 text-sm text-brand-text-secondary">No lines match this filter.</p> : null}
        </div>
      </div>
      <div ref={panelRef} className="min-w-0 scroll-mt-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
        {selected ? (
          <LinePanel key={selected.item.id} line={selected} annualVolume={annualVolume} suppliers={suppliers} />
        ) : (
          <EmptyState title="Select a line" />
        )}
      </div>
    </div>
  )
}

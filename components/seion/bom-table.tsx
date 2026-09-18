"use client"

import type { BomItem, MatchStatus } from "@/lib/db/types"
import { cn } from "@/lib/utils"

export function BomTable({
  items,
  selectedId,
  onSelect,
}: {
  items: BomItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-brand-text-secondary">No line items yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-border bg-white shadow-bevel">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-brand-border bg-gray-50 text-xs uppercase tracking-wide text-brand-text-secondary">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Part</th>
            <th className="px-3 py-2 font-medium">Spec</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Unit cost</th>
            <th className="px-3 py-2 font-medium">Match</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selected = item.id === selectedId
            return (
              <tr
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "cursor-pointer border-b border-brand-border last:border-0",
                  selected ? "bg-blue-50" : "hover:bg-gray-50",
                )}
              >
                <td className="px-3 py-2 text-brand-text-secondary">{item.line_number}</td>
                <td className="px-3 py-2">
                  <p className="font-medium text-brand-text-primary">{item.part_name || "—"}</p>
                  <p className="text-xs text-brand-text-secondary">{item.part_number || ""}</p>
                </td>
                <td className="px-3 py-2 text-brand-text-secondary">{item.original_spec || "—"}</td>
                <td className="px-3 py-2">{item.quantity_per_vehicle}</td>
                <td className="px-3 py-2">
                  {item.current_unit_cost == null ? "—" : formatInr(item.current_unit_cost)}
                </td>
                <td className="px-3 py-2">
                  <MatchBadge status={item.match_status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MatchBadge({ status }: { status: MatchStatus }) {
  if (status === "NEEDS_REVIEW") {
    return (
      <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
        Needs review
      </span>
    )
  }
  if (status === "MATCHED") {
    return (
      <span className="rounded border border-green-100 bg-green-50 px-2 py-0.5 text-xs font-medium text-brand-green">
        Matched
      </span>
    )
  }
  return (
    <span className="rounded border border-brand-border bg-gray-50 px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
      Custom
    </span>
  )
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

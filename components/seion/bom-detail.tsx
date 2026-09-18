"use client"

import { useMemo, useState } from "react"
import { AlternativeCard } from "@/components/seion/alternative-card"
import { BomTable } from "@/components/seion/bom-table"
import type { BomItem, PartAlternative } from "@/lib/db/types"

export function BomDetail({
  items,
  alternatives,
  canAccept,
}: {
  items: BomItem[]
  alternatives: PartAlternative[]
  canAccept: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)
  const selected = items.find((item) => item.id === selectedId) ?? null
  const alts = useMemo(
    () =>
      alternatives
        .filter((alt) => alt.bom_item_id === selectedId)
        .sort((a, b) => a.rank_order - b.rank_order),
    [alternatives, selectedId],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <BomTable items={items} selectedId={selectedId} onSelect={setSelectedId} />
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold text-brand-text-primary">Alternatives</h2>
        {!selected ? (
          <p className="text-sm text-brand-text-secondary">Select a line item.</p>
        ) : selected.match_status === "NEEDS_REVIEW" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Needs review</p>
            <p className="mt-1 text-xs text-amber-700">No mapped alternatives for this line.</p>
          </div>
        ) : alts.length === 0 ? (
          <p className="text-sm text-brand-text-secondary">No alternatives listed.</p>
        ) : (
          alts.map((alt) => (
            <AlternativeCard key={alt.id} alternative={alt} canAccept={canAccept} />
          ))
        )}
      </aside>
    </div>
  )
}

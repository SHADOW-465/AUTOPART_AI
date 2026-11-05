import Link from "next/link"
import { RfqCard } from "@/components/seion/rfq-card"
import { EmptyState, PageHeader } from "@/components/seion/ui"
import { getDb } from "@/lib/db/app"
import { listRfqs } from "@/lib/repo/rfqs"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function RfqsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const showAll = view === "all"
  const db = getDb()
  const rfqs = listRfqs(db, { open: !showAll })
  const total = listRfqs(db).length

  return (
    <>
      <PageHeader
        title="RFQs"
        description="Requests for quotation to domestic suppliers. Recording a quote updates the supplier's price list and re-prices the BOM line."
        actions={
          <div className="flex rounded-lg border border-brand-border bg-white p-0.5 text-xs font-semibold">
            <Link href="/rfqs" className={cn("rounded-md px-3 py-1.5", !showAll ? "bg-brand-blue text-white" : "text-brand-text-secondary")}>
              Open
            </Link>
            <Link href="/rfqs?view=all" className={cn("rounded-md px-3 py-1.5", showAll ? "bg-brand-blue text-white" : "text-brand-text-secondary")}>
              All ({total})
            </Link>
          </div>
        }
      />
      {rfqs.length === 0 ? (
        <EmptyState title={showAll ? "No RFQs yet" : "No open RFQs"}>
          Draft an RFQ from any alternative on a BOM line.{" "}
          <Link href="/boms" className="font-semibold text-brand-blue">
            Go to BOMs
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rfqs.map((rfq) => (
            <RfqCard key={rfq.id} rfq={rfq} />
          ))}
        </div>
      )}
    </>
  )
}

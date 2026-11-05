import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download, FileText } from "lucide-react"
import { BomStatusBadge } from "@/components/seion/badges"
import { BomActions, BomMetaForm } from "@/components/seion/bom-controls"
import { BomWorkbench } from "@/components/seion/bom-workbench"
import { buttonClass, Card, Stat } from "@/components/seion/ui"
import { loadBomDetail } from "@/lib/boms/view"
import { getDb } from "@/lib/db/app"
import { date, dateTime, inr, inrShort, num, pct } from "@/lib/format"
import { listSuppliers } from "@/lib/repo/suppliers"

export const dynamic = "force-dynamic"

export default async function BomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ line?: string }>
}) {
  const [{ id }, { line }] = await Promise.all([params, searchParams])
  const db = getDb()
  const detail = loadBomDetail(db, id)
  if (!detail) notFound()
  const { bom, lines, summary, events } = detail
  const suppliers = listSuppliers(db).map((s) => ({ id: s.id, name: s.name }))
  const perVehicleSaving = summary.costPerVehicle - summary.proposedCostPerVehicle

  return (
    <>
      <Link href="/boms" className="inline-flex items-center gap-1 text-sm font-medium text-brand-text-secondary hover:text-brand-text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All BOMs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-text-secondary">
            {bom.bom_code}
            {bom.customer_name ? ` · ${bom.customer_name}` : ""}
            {bom.vehicle_platform ? ` · ${bom.vehicle_platform}` : ""}
          </p>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-brand-text-primary">
            {bom.title} <BomStatusBadge status={bom.status} />
          </h1>
          <p className="text-xs text-brand-text-secondary">
            {bom.source_filename ? `${bom.source_filename} · ` : ""}uploaded {date(bom.created_at)} · {num(bom.annual_volume, 0)} vehicles / year
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <a href={`/print/boms/${bom.id}`} target="_blank" rel="noopener" className={buttonClass("primary", "sm")}>
            <FileText className="h-3.5 w-3.5" aria-hidden /> Proposal pack
          </a>
          <a href={`/boms/${bom.id}/export`} className={buttonClass("secondary", "sm")}>
            <Download className="h-3.5 w-3.5" aria-hidden /> CSV
          </a>
          <BomActions bom={bom} />
        </div>
      </div>

      {bom.status === "FAILED" ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-brand-red">
          <p className="font-semibold">Import failed</p>
          <p className="mt-1">{bom.error_message}</p>
          <p className="mt-2 text-xs text-red-800">
            Fix the file and upload it again from <Link href="/boms" className="underline">BOMs</Link>. If the header row isn’t recognised, rename columns to match the BOM template (or set GROQ_API_KEY for AI extraction) and use Re-import.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="IS match" value={`${summary.matched} / ${summary.lines}`} hint={`${pct(summary.matchRate * 100, 0)} · ${summary.needsReview} to review`} />
        <Stat label="Cost per vehicle" value={inr(summary.costPerVehicle, 0)} hint="Lines with a current cost" />
        <Stat
          label="With accepted swaps"
          value={inr(summary.proposedCostPerVehicle, 0)}
          hint={perVehicleSaving === 0 ? "No accepted swaps yet" : `${perVehicleSaving > 0 ? "−" : "+"}${inr(Math.abs(perVehicleSaving))} per vehicle`}
        />
        <Stat label="Proposed savings / yr" value={inrShort(summary.proposedAnnual)} tone={summary.proposedAnnual < 0 ? "red" : "green"} hint={`${summary.accepted} accepted`} />
        <Stat label="Customer-approved / yr" value={inrShort(summary.approvedAnnual)} tone="green" hint={`${summary.approved} approved`} />
        <Stat label="Awaiting customer" value={summary.pendingApproval} hint="Accepted, not approved" />
      </div>

      <details className="group rounded-xl border border-brand-border bg-white shadow-bevel">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-brand-text-primary">
          BOM details <span className="font-normal text-brand-text-secondary">(title, customer, platform, annual volume)</span>
        </summary>
        <div className="border-t border-brand-border p-4">
          <BomMetaForm bom={bom} />
        </div>
      </details>

      <BomWorkbench lines={lines} annualVolume={bom.annual_volume} suppliers={suppliers} initialLineId={line} />

      <Card title="Activity">
        {events.length === 0 ? (
          <p className="text-sm text-brand-text-secondary">No activity yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <span className="w-32 shrink-0 text-xs text-brand-text-secondary">{dateTime(e.created_at)}</span>
                <span className="text-brand-text-primary">{e.summary}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  )
}

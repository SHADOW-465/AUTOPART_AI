import Link from "next/link"
import { BomStatusBadge } from "@/components/seion/badges"
import { Card, EmptyState, PageHeader, tableClass, TableWrap, tdClass, thClass } from "@/components/seion/ui"
import { UploadPanel } from "@/components/seion/upload-panel"
import { loadWorkspace } from "@/lib/boms/workspace"
import { getDb } from "@/lib/db/app"
import { date, inrShort, num, pct, savingsClass } from "@/lib/format"
import { getSettings } from "@/lib/repo/settings"

export const dynamic = "force-dynamic"

export default function BomsPage() {
  const db = getDb()
  const { boms } = loadWorkspace(db)
  const settings = getSettings(db)

  return (
    <>
      <PageHeader title="BOMs" description="Upload customer BOMs, then review each line's Indian Standard alternative." />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        <Card title={`All BOMs (${boms.length})`} bodyClassName="p-0">
          {boms.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No BOMs yet">Upload one, or try the sample BOM to see the workflow.</EmptyState>
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className="border-b border-brand-border bg-gray-50">
                  <tr>
                    <th className={thClass}>BOM</th>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Volume / yr</th>
                    <th className={thClass}>Lines</th>
                    <th className={thClass}>IS match</th>
                    <th className={thClass}>Accepted</th>
                    <th className={thClass}>Proposed / yr</th>
                    <th className={thClass}>Approved / yr</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {boms.map((bom) => (
                    <tr key={bom.id} className="border-b border-brand-border last:border-0 hover:bg-gray-50">
                      <td className={tdClass}>
                        <Link href={`/boms/${bom.id}`} className="font-semibold text-brand-text-primary hover:text-brand-blue">
                          {bom.title}
                        </Link>
                        <p className="text-xs text-brand-text-secondary">
                          {bom.bom_code} · {date(bom.created_at)}
                        </p>
                        {bom.status === "FAILED" && bom.error_message ? (
                          <p className="mt-1 max-w-sm text-xs text-brand-red">{bom.error_message}</p>
                        ) : null}
                      </td>
                      <td className={tdClass}>{bom.customer_name ?? "—"}</td>
                      <td className={tdClass}>{num(bom.annual_volume, 0)}</td>
                      <td className={tdClass}>{bom.summary.lines}</td>
                      <td className={tdClass}>
                        {pct(bom.summary.matchRate * 100, 0)}
                        {bom.summary.needsReview ? <p className="text-xs text-amber-700">{bom.summary.needsReview} to review</p> : null}
                      </td>
                      <td className={tdClass}>{bom.summary.accepted}</td>
                      <td className={`${tdClass} font-medium ${savingsClass(bom.summary.proposedAnnual)}`}>
                        {inrShort(bom.summary.proposedAnnual)}
                      </td>
                      <td className={`${tdClass} font-medium ${savingsClass(bom.summary.approvedAnnual)}`}>{inrShort(bom.summary.approvedAnnual)}</td>
                      <td className={tdClass}>
                        <BomStatusBadge status={bom.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
        <Card title="Upload a BOM" description="Header row is detected automatically: part no, description, spec, qty, unit price…">
          <UploadPanel defaultAnnualVolume={settings.default_annual_volume} compact />
        </Card>
      </div>
    </>
  )
}

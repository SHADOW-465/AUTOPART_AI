import Link from "next/link"
import { AlertTriangle, CheckCircle2, ClipboardCheck, Mail } from "lucide-react"
import { BomStatusBadge } from "@/components/seion/badges"
import { Card, PageHeader, Stat, tableClass, TableWrap, tdClass, thClass } from "@/components/seion/ui"
import { UploadPanel } from "@/components/seion/upload-panel"
import { loadWorkspace } from "@/lib/boms/workspace"
import { getDb } from "@/lib/db/client"
import { inrShort, pct, savingsClass } from "@/lib/format"
import { getSettings } from "@/lib/repo/settings"

export const dynamic = "force-dynamic"

export default function DashboardPage() {
  const db = getDb()
  const { boms, totals } = loadWorkspace(db)
  const settings = getSettings(db)

  if (boms.length === 0) {
    return (
      <>
        <PageHeader
          title="Welcome to SEION AutoPart"
          description="Turn a foreign-spec customer BOM into a BIS / Indian Standard localization proposal your customer can approve."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Step n={1} title="Plant details" done={Boolean(settings.company_name)}>
            Your company, location and contact go on every RFQ and proposal. <Link className="font-semibold text-brand-blue" href="/settings">Open settings</Link>
          </Step>
          <Step n={2} title="Upload a BOM">
            Any .xlsx / .csv with part, spec and quantity columns. No template? Use the sample to see the full workflow.
          </Step>
          <Step n={3} title="Review, RFQ and propose">
            Accept IS alternatives that pass validation, request quotes, then export the proposal pack for PPAP.
          </Step>
        </div>
        <Card title="Upload a BOM">
          <UploadPanel defaultAnnualVolume={settings.default_annual_volume} />
        </Card>
      </>
    )
  }

  const attention = boms.filter((b) => b.status === "FAILED" || b.summary.needsReview > 0 || b.summary.pendingApproval > 0).slice(0, 6)

  return (
    <>
      <PageHeader title="Dashboard" description="Localization progress across all BOMs." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Proposed annual savings" value={inrShort(totals.proposedAnnual)} tone={totals.proposedAnnual < 0 ? "red" : "green"} hint={`${totals.accepted} accepted swaps`} />
        <Stat label="Customer-approved / year" value={inrShort(totals.approvedAnnual)} tone="green" hint={`${totals.approved} approved`} />
        <Stat label="IS match rate" value={pct(totals.matchRate * 100, 0)} hint={`${totals.matched} of ${totals.lines} lines`} />
        <Stat label="Lines needing review" value={totals.needsReview} tone={totals.needsReview ? "amber" : undefined} />
        <Stat label="Awaiting customer" value={totals.pendingApproval} hint="Accepted, not yet approved" />
        <Stat label="Open RFQs" value={totals.openRfqs} hint={<Link href="/rfqs" className="text-brand-blue">View RFQs</Link>} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        <Card title="Recent BOMs" actions={<Link href="/boms" className="text-xs font-semibold text-brand-blue">All BOMs</Link>} bodyClassName="p-0">
          <TableWrap>
            <table className={tableClass}>
              <thead className="border-b border-brand-border bg-gray-50">
                <tr>
                  <th className={thClass}>BOM</th>
                  <th className={thClass}>Lines</th>
                  <th className={thClass}>Match</th>
                  <th className={thClass}>Proposed / yr</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {boms.slice(0, 6).map((bom) => (
                  <tr key={bom.id} className="border-b border-brand-border last:border-0 hover:bg-gray-50">
                    <td className={tdClass}>
                      <Link href={`/boms/${bom.id}`} className="font-semibold text-brand-text-primary hover:text-brand-blue">
                        {bom.title}
                      </Link>
                      <p className="text-xs text-brand-text-secondary">{bom.bom_code}{bom.customer_name ? ` · ${bom.customer_name}` : ""}</p>
                    </td>
                    <td className={tdClass}>{bom.summary.lines}</td>
                    <td className={tdClass}>{pct(bom.summary.matchRate * 100, 0)}</td>
                    <td className={`${tdClass} font-medium ${savingsClass(bom.summary.proposedAnnual)}`}>{inrShort(bom.summary.proposedAnnual)}</td>
                    <td className={tdClass}><BomStatusBadge status={bom.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>

        <div className="space-y-6">
          <Card title="Needs attention">
            {attention.length === 0 && totals.openRfqs === 0 ? (
              <p className="flex items-center gap-2 text-sm text-brand-green"><CheckCircle2 className="h-4 w-4" aria-hidden /> Nothing waiting on you.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {attention.map((bom) => (
                  <li key={bom.id}>
                    <Link href={`/boms/${bom.id}`} className="group flex gap-2">
                      {bom.status === "FAILED" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden />
                      ) : bom.summary.needsReview > 0 ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      ) : (
                        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-brand-text-primary group-hover:text-brand-blue">{bom.title}</span>
                        <span className="block text-xs text-brand-text-secondary">
                          {bom.status === "FAILED"
                            ? "Import failed — open to see why"
                            : [
                                bom.summary.needsReview ? `${bom.summary.needsReview} lines need review` : null,
                                bom.summary.pendingApproval ? `${bom.summary.pendingApproval} awaiting customer` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {totals.openRfqs > 0 ? (
                  <li>
                    <Link href="/rfqs" className="group flex gap-2">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
                      <span className="font-semibold text-brand-text-primary group-hover:text-brand-blue">
                        {totals.openRfqs} open RFQ{totals.openRfqs === 1 ? "" : "s"} awaiting quotes
                      </span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </Card>
          <Card title="Upload a BOM">
            <UploadPanel defaultAnnualVolume={settings.default_annual_volume} compact />
          </Card>
        </div>
      </div>
    </>
  )
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-border bg-white p-4 shadow-bevel">
      <p className="flex items-center gap-2 text-sm font-bold text-brand-text-primary">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${done ? "bg-brand-green text-white" : "bg-blue-50 text-brand-blue"}`}>
          {done ? "✓" : n}
        </span>
        {title}
      </p>
      <p className="mt-2 text-sm text-brand-text-secondary">{children}</p>
    </div>
  )
}

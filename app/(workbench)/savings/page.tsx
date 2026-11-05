import Link from "next/link"
import { CategorySavingsChart, Legend, MonthlySavingsChart } from "@/components/seion/savings-charts"
import { Card, EmptyState, PageHeader, Stat, tableClass, TableWrap, tdClass, thClass } from "@/components/seion/ui"
import { savingsByCategory, savingsByMonth } from "@/lib/boms/savings"
import { loadWorkspace } from "@/lib/boms/workspace"
import { getDb } from "@/lib/db/client"
import { inr, inrShort, monthLabel, num, savingsClass } from "@/lib/format"

export const dynamic = "force-dynamic"

export default function SavingsPage() {
  const { boms, totals, decisions } = loadWorkspace(getDb())
  const monthly = savingsByMonth(decisions).map((m) => ({ label: monthLabel(m.month), ...m }))
  const byCategory = savingsByCategory(decisions).map((c) => ({ label: c.category, ...c }))
  const withDecisions = boms.filter((b) => b.summary.accepted > 0)

  return (
    <>
      <PageHeader
        title="Savings"
        description="Annual savings = (current − alternative unit price) × qty per vehicle × annual volume. Savings count as realised only once the customer approves the change."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Proposed annual savings" value={inrShort(totals.proposedAnnual)} tone={totals.proposedAnnual < 0 ? "red" : "green"} hint={`${totals.accepted} accepted swaps`} />
        <Stat label="Customer-approved / year" value={inrShort(totals.approvedAnnual)} tone="green" hint={`${totals.approved} approved`} />
        <Stat
          label="Approval conversion"
          value={totals.accepted ? `${Math.round((totals.approved / totals.accepted) * 100)}%` : "—"}
          hint="Approved ÷ accepted"
        />
        <Stat label="Awaiting customer" value={totals.pendingApproval} />
      </div>

      {decisions.length === 0 ? (
        <EmptyState title="No accepted alternatives yet">
          Accept IS alternatives on a <Link href="/boms" className="font-semibold text-brand-blue">BOM</Link> to start tracking savings.
        </EmptyState>
      ) : (
        <>
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Card title="Annual savings by month" description="Proposed by month accepted; approved by month the customer approved." actions={<Legend />}>
              <MonthlySavingsChart data={monthly} />
              <TableWrap>
                <table className={`${tableClass} mt-3`}>
                  <caption className="sr-only">Annual savings by month</caption>
                  <thead className="border-b border-brand-border">
                    <tr>
                      <th className={thClass}>Month</th>
                      <th className={thClass}>Proposed</th>
                      <th className={thClass}>Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.month} className="border-b border-brand-border last:border-0">
                        <td className={tdClass}>{m.label}</td>
                        <td className={tdClass}>{inr(m.proposed, 0)}</td>
                        <td className={tdClass}>{inr(m.approved, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </Card>
            <Card title="By category" description="Excludes swaps the customer rejected." actions={<Legend />}>
              <CategorySavingsChart data={byCategory} />
            </Card>
          </div>
          <Card title="By BOM" bodyClassName="p-0">
            <TableWrap>
              <table className={tableClass}>
                <thead className="border-b border-brand-border bg-gray-50">
                  <tr>
                    <th className={thClass}>BOM</th>
                    <th className={thClass}>Volume / yr</th>
                    <th className={thClass}>Accepted</th>
                    <th className={thClass}>Approved</th>
                    <th className={thClass}>Cost / vehicle now → proposed</th>
                    <th className={thClass}>Proposed / yr</th>
                    <th className={thClass}>Approved / yr</th>
                  </tr>
                </thead>
                <tbody>
                  {withDecisions.map((b) => (
                    <tr key={b.id} className="border-b border-brand-border last:border-0">
                      <td className={tdClass}>
                        <Link href={`/boms/${b.id}`} className="font-semibold hover:text-brand-blue">
                          {b.title}
                        </Link>
                        <p className="text-xs text-brand-text-secondary">{b.bom_code}</p>
                      </td>
                      <td className={tdClass}>{num(b.annual_volume, 0)}</td>
                      <td className={tdClass}>{b.summary.accepted}</td>
                      <td className={tdClass}>{b.summary.approved}</td>
                      <td className={tdClass}>
                        {inr(b.summary.costPerVehicle, 0)} → {inr(b.summary.proposedCostPerVehicle, 0)}
                      </td>
                      <td className={`${tdClass} font-medium ${savingsClass(b.summary.proposedAnnual)}`}>{inr(b.summary.proposedAnnual, 0)}</td>
                      <td className={`${tdClass} font-medium ${savingsClass(b.summary.approvedAnnual)}`}>{inr(b.summary.approvedAnnual, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}
    </>
  )
}

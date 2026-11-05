import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { CertBadges, OriginBadge, PriceSourceBadge, RfqStatusBadge } from "@/components/seion/badges"
import { DeletePriceButton, DeleteSupplierButton, PriceForm, SupplierForm } from "@/components/seion/supplier-forms"
import { Card, EmptyState, PageHeader, tableClass, TableWrap, tdClass, thClass } from "@/components/seion/ui"
import { getDb } from "@/lib/db/client"
import { date, inr } from "@/lib/format"
import { listRfqs } from "@/lib/repo/rfqs"
import { listSpecs } from "@/lib/repo/standards"
import { getSupplier, listPricesForSupplier } from "@/lib/repo/suppliers"
import { humanize } from "@/lib/validation/rules"

export const dynamic = "force-dynamic"

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const supplier = getSupplier(db, id)
  if (!supplier) notFound()
  const prices = listPricesForSupplier(db, id)
  const rfqs = listRfqs(db, { supplierId: id })
  const isSpecs = listSpecs(db)
    .filter((s) => s.body === "IS")
    .map((s) => ({ id: s.id, code: s.code, family: humanize(s.part_family) }))

  return (
    <>
      <Link href="/suppliers" className="inline-flex items-center gap-1 text-sm font-medium text-brand-text-secondary hover:text-brand-text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All suppliers
      </Link>
      <PageHeader
        title={supplier.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <OriginBadge origin={supplier.origin} />
            <CertBadges bis={supplier.bis_licence_no} iatf={supplier.iatf_16949} iso={supplier.iso_9001} />
            {[supplier.industrial_hub, supplier.state].filter(Boolean).join(", ")}
          </span>
        }
        actions={<DeleteSupplierButton supplier={supplier} />}
      />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card title="Details">
          <SupplierForm supplier={supplier} />
        </Card>
        <div className="space-y-6">
          <Card title={`Price list (${prices.length})`} description="Used for offers on matched BOM lines. Re-match a BOM to pick up changes.">
            {prices.length === 0 ? (
              <EmptyState title="No prices yet">Add a price below or record a quote against an RFQ.</EmptyState>
            ) : (
              <TableWrap>
                <table className={tableClass}>
                  <thead className="border-b border-brand-border">
                    <tr>
                      <th className={thClass}>IS spec</th>
                      <th className={thClass}>Unit price</th>
                      <th className={thClass}>Lead</th>
                      <th className={thClass}>Valid until</th>
                      <th className={thClass}>Source</th>
                      <th className={thClass}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p) => (
                      <tr key={p.id} className="border-b border-brand-border last:border-0">
                        <td className={tdClass}>
                          <p className="font-medium">{p.spec_code}</p>
                          <p className="text-xs text-brand-text-secondary">{humanize(p.part_family)}</p>
                        </td>
                        <td className={tdClass}>{inr(p.unit_cost)}</td>
                        <td className={tdClass}>{p.lead_time_days == null ? "—" : `${p.lead_time_days} d`}</td>
                        <td className={tdClass}>{p.valid_until ? date(p.valid_until) : "—"}</td>
                        <td className={tdClass}>
                          <PriceSourceBadge source={p.source} />
                        </td>
                        <td className={tdClass}>
                          <DeletePriceButton id={p.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
            <div className="mt-4 border-t border-brand-border pt-4">
              <PriceForm supplierId={supplier.id} specs={isSpecs} />
            </div>
          </Card>
          <Card title={`RFQs (${rfqs.length})`}>
            {rfqs.length === 0 ? (
              <p className="text-sm text-brand-text-secondary">No RFQs sent to this supplier yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rfqs.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/rfqs?view=all#${r.id}`} className="font-semibold text-brand-blue">
                      {r.rfq_code}
                    </Link>
                    <span>{r.spec_code}</span>
                    <RfqStatusBadge status={r.status} />
                    {r.quoted_unit_cost != null ? <span className="font-medium text-brand-green">{inr(r.quoted_unit_cost)}</span> : null}
                    <span className="text-xs text-brand-text-secondary">{date(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

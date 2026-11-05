import Link from "next/link"
import { CertBadges, OriginBadge } from "@/components/seion/badges"
import { SupplierForm } from "@/components/seion/supplier-forms"
import { Card, EmptyState, PageHeader, tableClass, TableWrap, tdClass, thClass } from "@/components/seion/ui"
import { getDb } from "@/lib/db/client"
import { num } from "@/lib/format"
import { listSuppliers } from "@/lib/repo/suppliers"

export const dynamic = "force-dynamic"

export default function SuppliersPage() {
  const suppliers = listSuppliers(getDb())
  const seedCount = suppliers.filter((s) => s.origin === "SEED").length

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Domestic suppliers and their IS price lists. Offers on BOM lines come from here, cheapest first."
      />
      {seedCount > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {seedCount} sample suppliers marked <strong>Seed</strong> ship with indicative prices so you can try the workflow. Replace them with your approved
          vendors, or let RFQ quotes overwrite their prices.
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card title={`Directory (${suppliers.length})`} bodyClassName="p-0">
          {suppliers.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No suppliers yet" />
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className="border-b border-brand-border bg-gray-50">
                  <tr>
                    <th className={thClass}>Supplier</th>
                    <th className={thClass}>Location</th>
                    <th className={thClass}>Compliance</th>
                    <th className={thClass}>Lead time</th>
                    <th className={thClass}>Prices</th>
                    <th className={thClass}>Open RFQs</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-brand-border last:border-0 hover:bg-gray-50">
                      <td className={tdClass}>
                        <Link href={`/suppliers/${s.id}`} className="font-semibold text-brand-text-primary hover:text-brand-blue">
                          {s.name}
                        </Link>{" "}
                        <OriginBadge origin={s.origin} />
                        <p className="text-xs text-brand-text-secondary">{s.email ?? "No email"}</p>
                      </td>
                      <td className={tdClass}>{[s.industrial_hub, s.state].filter(Boolean).join(", ") || "—"}</td>
                      <td className={tdClass}>
                        <CertBadges bis={s.bis_licence_no} iatf={s.iatf_16949} iso={s.iso_9001} />
                      </td>
                      <td className={tdClass}>{s.lead_time_days == null ? "—" : `${s.lead_time_days} d`}</td>
                      <td className={tdClass}>{num(s.price_count, 0)}</td>
                      <td className={tdClass}>{s.open_rfqs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
        <Card title="Add supplier">
          <SupplierForm />
        </Card>
      </div>
    </>
  )
}

import Link from "next/link"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/seion/client"
import { loadBomDetail, type LineView } from "@/lib/boms/view"
import { getDb } from "@/lib/db/client"
import { date, inr, num, pct } from "@/lib/format"
import { CUSTOMER_STATUS_LABELS, EQUIVALENCE_LABELS, RECOMMENDATION_LABELS } from "@/lib/labels"
import { getSettings } from "@/lib/repo/settings"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = loadBomDetail(getDb(), id)
  return { title: detail ? `Proposal ${detail.bom.bom_code} – ${detail.bom.title}` : "Proposal" }
}

const th = "border border-gray-300 bg-gray-100 px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide"
const td = "border border-gray-300 px-2 py-1 align-top"

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const detail = loadBomDetail(db, id)
  if (!detail) notFound()
  const settings = getSettings(db)
  const { bom, lines, summary } = detail

  const accepted = lines.filter((l) => l.accepted && l.accepted.customer_status !== "REJECTED")
  const isDraft = accepted.length === 0
  const proposed: LineView[] = isDraft ? lines.filter((l) => l.item.match_status === "MATCHED") : accepted
  const unresolved = lines.filter((l) => l.item.match_status === "NEEDS_REVIEW")
  const seedUsed = proposed.some((l) => {
    const alt = l.accepted ?? l.alternatives[0]
    return alt?.price_source === "SEED"
  })

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-brand-border bg-white px-4 py-2">
        <Link href={`/boms/${bom.id}`} className="text-sm font-semibold text-brand-blue">
          ← Back to BOM
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto my-6 max-w-[210mm] bg-white p-8 text-[12px] leading-snug text-gray-900 shadow print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-gray-900 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Localization change proposal{isDraft ? " — draft" : ""}</p>
            <h1 className="text-xl font-bold">{bom.title}</h1>
            <p>
              {bom.bom_code}
              {bom.customer_name ? ` · Customer: ${bom.customer_name}` : ""}
              {bom.vehicle_platform ? ` · Platform: ${bom.vehicle_platform}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold">{settings.company_name || "Supplier name not set"}</p>
            {settings.plant_location ? <p>{settings.plant_location}</p> : null}
            {settings.gstin ? <p>GSTIN {settings.gstin}</p> : null}
            <p>Date: {date(new Date().toISOString())}</p>
          </div>
        </header>

        <section className="mt-4">
          <h2 className="mb-1 text-sm font-bold">1. Summary</h2>
          <p>
            Of {summary.lines} BOM lines, {summary.matched} map to a recorded Indian Standard (IS) equivalent. This proposal covers{" "}
            {proposed.length} line{proposed.length === 1 ? "" : "s"}
            {isDraft ? " (no alternatives accepted yet; best available options shown for discussion)" : " accepted by the supplier for localization"}.
          </p>
          <table className="mt-2 w-full border-collapse">
            <tbody>
              <tr>
                <td className={td}>Annual vehicle volume</td>
                <td className={td}>{num(bom.annual_volume, 0)}</td>
                <td className={td}>Current BOM cost / vehicle (priced lines)</td>
                <td className={td}>{inr(summary.costPerVehicle)}</td>
              </tr>
              <tr>
                <td className={td}>Lines proposed</td>
                <td className={td}>{proposed.length}</td>
                <td className={td}>Cost / vehicle after accepted changes</td>
                <td className={td}>{inr(summary.proposedCostPerVehicle)}</td>
              </tr>
              <tr>
                <td className={td}>Customer-approved so far</td>
                <td className={td}>{summary.approved}</td>
                <td className={td}>Estimated annual saving (accepted)</td>
                <td className={`${td} font-bold`}>{inr(summary.proposedAnnual, 0)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-5">
          <h2 className="mb-1 text-sm font-bold">2. Proposed changes</h2>
          {proposed.length === 0 ? (
            <p>No lines have a recorded IS equivalent yet.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>#</th>
                  <th className={th}>Part</th>
                  <th className={th}>Current spec</th>
                  <th className={th}>Proposed IS spec</th>
                  <th className={th}>Validation</th>
                  <th className={th}>Source (BIS / IATF)</th>
                  <th className={th}>Unit price now → new</th>
                  <th className={th}>Annual impact</th>
                  <th className={th}>Customer status</th>
                </tr>
              </thead>
              <tbody>
                {proposed.map((l) => {
                  const alt = l.accepted ?? l.alternatives.find((a) => a.status !== "REJECTED") ?? null
                  return (
                    <tr key={l.item.id} className="break-inside-avoid">
                      <td className={td}>{l.item.line_number}</td>
                      <td className={td}>
                        {l.item.part_name}
                        {l.item.part_number ? <div className="text-gray-500">{l.item.part_number}</div> : null}
                        <div className="text-gray-500">{num(l.item.quantity)} / vehicle</div>
                      </td>
                      <td className={td}>{l.item.original_spec ?? l.fromSpec?.code ?? "—"}</td>
                      <td className={td}>
                        <strong>{l.toSpec?.code}</strong>
                        <div className="text-gray-500">{l.item.equivalence ? EQUIVALENCE_LABELS[l.item.equivalence] : ""}</div>
                      </td>
                      <td className={td}>{l.validation ? RECOMMENDATION_LABELS[l.validation.recommendation] : "—"}</td>
                      <td className={td}>
                        {alt?.supplier_name ?? "To be quoted"}
                        {alt?.supplier_id ? (
                          <div className="text-gray-500">
                            BIS: {alt.bis_licence_no ?? "not recorded"} · IATF: {alt.iatf_16949 ? "yes" : "no"}
                          </div>
                        ) : null}
                      </td>
                      <td className={td}>
                        {inr(l.item.current_unit_cost)} → {inr(alt?.unit_cost)}
                        {alt?.delta.pct != null ? <div className="text-gray-500">{alt.delta.pct >= 0 ? "−" : "+"}{pct(Math.abs(alt.delta.pct))}</div> : null}
                      </td>
                      <td className={td}>{alt?.delta.annual != null ? inr(alt.delta.annual, 0) : "—"}</td>
                      <td className={td}>
                        {alt?.status === "ACCEPTED" ? CUSTOMER_STATUS_LABELS[alt.customer_status] : "Proposed"}
                        {alt?.customer_ref ? <div className="text-gray-500">{alt.customer_ref}</div> : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {proposed.length > 0 ? (
          <section className="mt-5">
            <h2 className="mb-1 text-sm font-bold">3. Engineering validation detail</h2>
            <p className="mb-2 text-gray-600">
              Rule-based comparison of recorded properties of the source standard and the proposed Indian Standard. Warnings must be closed by
              drawing review, test, or mill test certificate before PPAP submission.
            </p>
            {proposed.map((l) =>
              l.validation ? (
                <div key={l.item.id} className="mb-2 break-inside-avoid">
                  <p className="font-semibold">
                    Line {l.item.line_number}: {l.fromSpec?.code} → {l.toSpec?.code} — {RECOMMENDATION_LABELS[l.validation.recommendation]}
                  </p>
                  <ul className="ml-4 list-disc">
                    {l.validation.checks.map((c) => (
                      <li key={c.id}>
                        <span className="font-semibold uppercase">{c.status}</span> {c.label}: {c.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </section>
        ) : null}

        {unresolved.length > 0 ? (
          <section className="mt-5 break-inside-avoid">
            <h2 className="mb-1 text-sm font-bold">4. Lines not proposed for localization</h2>
            <p className="text-gray-600">No recorded IS equivalent; these remain on the current source pending engineering review.</p>
            <p className="mt-1">
              {unresolved.map((l) => `${l.item.line_number}. ${l.item.part_name ?? l.item.original_spec ?? "—"}`).join(" · ")}
            </p>
          </section>
        ) : null}

        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-1 text-sm font-bold">Notes</h2>
          <ul className="ml-4 list-disc text-gray-700">
            <li>No change will be implemented in production before written customer approval (PPAP / ECN), per IATF 16949.</li>
            <li>Proposed suppliers will provide BIS licence details for products covered by a Quality Control Order, and EN 10204 3.1 mill test certificates per lot.</li>
            {seedUsed ? <li>Some prices are indicative catalogue values pending formal quotation.</li> : null}
          </ul>
        </section>

        <section className="mt-8 grid break-inside-avoid grid-cols-3 gap-6">
          {["Prepared by (supplier)", "Quality / SQA (supplier)", "Customer approval"].map((role, i) => (
            <div key={role}>
              <div className="h-12 border-b border-gray-900" />
              <p className="mt-1 font-semibold">{role}</p>
              <p className="text-gray-500">{i === 0 && settings.contact_name ? settings.contact_name : "Name / signature / date"}</p>
            </div>
          ))}
        </section>
      </article>
    </div>
  )
}

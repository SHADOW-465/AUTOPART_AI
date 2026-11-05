import { Search } from "lucide-react"
import { EquivalenceBadge, OriginBadge } from "@/components/seion/badges"
import { AddEquivalenceForm, AddSpecForm, DeleteEquivalenceButton, DeleteSpecButton } from "@/components/seion/standards-forms"
import { buttonClass, Card, inputClass, PageHeader, tableClass, TableWrap, tdClass, thClass } from "@/components/seion/ui"
import { getDb } from "@/lib/db/app"
import type { MechanicalFields } from "@/lib/db/types"
import { listEquivalents, listSpecs } from "@/lib/repo/standards"
import { humanize } from "@/lib/validation/rules"

export const dynamic = "force-dynamic"

function mechanicalSummary(m: MechanicalFields): string {
  return (
    [
      m.property_class && `class ${m.property_class}`,
      m.tensile_mpa_min != null && `Rm ≥ ${m.tensile_mpa_min}`,
      m.yield_mpa_min != null && `Re ≥ ${m.yield_mpa_min}`,
      m.hardness,
      m.thread_fit && `thread ${m.thread_fit}`,
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  )
}

export default async function StandardsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams
  const db = getDb()
  const equivalents = listEquivalents(db, q)
  const specs = listSpecs(db, q)
  const allSpecs = listSpecs(db).map((s) => ({ id: s.id, code: s.code, body: s.body, family: humanize(s.part_family) }))

  return (
    <>
      <PageHeader
        title="Standards library"
        description="The source of truth for matching. Every IS alternative comes from an equivalence recorded here — add your plant-verified pairs to raise the match rate."
      />
      <form className="flex max-w-xl gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search standards
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search code, family or notes (e.g. 933, washer, 16MnCr5)" className={inputClass} />
        <button type="submit" className={buttonClass("secondary", "md")}>
          <Search className="h-4 w-4" aria-hidden /> Search
        </button>
      </form>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          <Card title={`Equivalences (${equivalents.length})`} description="Directed: customer spec → Indian Standard." bodyClassName="p-0">
            <TableWrap>
              <table className={tableClass}>
                <thead className="border-b border-brand-border bg-gray-50">
                  <tr>
                    <th className={thClass}>From</th>
                    <th className={thClass}>To</th>
                    <th className={thClass}>Level</th>
                    <th className={thClass}>Notes</th>
                    <th className={thClass}>Origin</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody>
                  {equivalents.map((e) => (
                    <tr key={e.id} className="border-b border-brand-border last:border-0">
                      <td className={`${tdClass} whitespace-nowrap font-medium`}>{e.from_code}</td>
                      <td className={`${tdClass} whitespace-nowrap font-medium text-brand-blue`}>{e.to_code}</td>
                      <td className={tdClass}>
                        <EquivalenceBadge level={e.equivalence} />
                      </td>
                      <td className={`${tdClass} text-xs text-brand-text-secondary`}>
                        {e.notes ?? "—"}
                        {e.source_ref && e.origin === "PLANT" ? <span className="block">Ref: {e.source_ref}</span> : null}
                      </td>
                      <td className={tdClass}>
                        <OriginBadge origin={e.origin} />
                      </td>
                      <td className={tdClass}>
                        <DeleteEquivalenceButton id={e.id} label={`${e.from_code} → ${e.to_code}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {equivalents.length === 0 ? <p className="p-4 text-sm text-brand-text-secondary">No equivalences match “{q}”.</p> : null}
          </Card>

          <Card title={`Standards (${specs.length})`} bodyClassName="p-0">
            <TableWrap>
              <table className={tableClass}>
                <thead className="border-b border-brand-border bg-gray-50">
                  <tr>
                    <th className={thClass}>Code</th>
                    <th className={thClass}>Family</th>
                    <th className={thClass}>Properties</th>
                    <th className={thClass}>Match key</th>
                    <th className={thClass}>Origin</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((s) => (
                    <tr key={s.id} className="border-b border-brand-border last:border-0">
                      <td className={tdClass}>
                        <p className="whitespace-nowrap font-medium">{s.code}</p>
                        {s.notes ? <p className="max-w-xs text-xs text-brand-text-secondary">{s.notes}</p> : null}
                      </td>
                      <td className={`${tdClass} text-xs`}>{humanize(s.part_family)}</td>
                      <td className={`${tdClass} text-xs text-brand-text-secondary`}>{mechanicalSummary(s.mechanical)}</td>
                      <td className={`${tdClass} font-mono text-[11px] text-brand-text-secondary`}>{s.canonical_key}</td>
                      <td className={tdClass}>
                        <OriginBadge origin={s.origin} />
                      </td>
                      <td className={tdClass}>
                        <DeleteSpecButton id={s.id} code={s.code} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Add equivalence" description="Pair a customer spec with its Indian Standard. Both must exist below.">
            <AddEquivalenceForm specs={allSpecs} />
          </Card>
          <Card title="Add standard" description="Customer-side (DIN/ISO/EN…) or Indian Standard, with properties used by validation.">
            <AddSpecForm />
          </Card>
        </div>
      </div>
    </>
  )
}

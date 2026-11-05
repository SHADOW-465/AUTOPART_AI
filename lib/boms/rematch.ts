import { transaction, type Db } from "@/lib/db/client"
import type { BomItem } from "@/lib/db/types"
import { canonicalizeSpec } from "@/lib/matching/canonicalize"
import { findStandardReference } from "@/lib/ingestion/normalize"
import { matchEquivalent } from "@/lib/matching/lookup"
import type { MatchResult, StandardsCatalog } from "@/lib/matching/types"
import {
  deleteUndecidedForItem,
  insertAlternative,
  listAlternativesForItem,
  rerank,
  updateAlternativePrice,
} from "@/lib/repo/alternatives"
import { getItem, listItems, setItemMatch } from "@/lib/repo/boms"
import { loadCatalog } from "@/lib/repo/standards"
import { getPrice, listOffersForSpec } from "@/lib/repo/suppliers"

export const MAX_OFFERS = 3

/**
 * Re-runs standards matching and supplier offers for one line.
 * Plant decisions (ACCEPTED alternatives) are kept; everything else is rebuilt from current data.
 */
export function rematchItem(db: Db, item: BomItem, catalog: StandardsCatalog): void {
  const { canonical, match } = findMatch(item, catalog)

  setItemMatch(db, item.id, {
    canonical_spec_key: canonical || null,
    match_status: match.status,
    from_spec_id: match.status === "MATCHED" ? match.fromSpec.id : null,
    to_spec_id: match.status === "MATCHED" ? match.toSpec.id : null,
    equivalence: match.status === "MATCHED" ? match.equivalence : null,
  })

  deleteUndecidedForItem(db, item.id)
  const kept = listAlternativesForItem(db, item.id)

  for (const alt of kept) {
    if (!alt.supplier_id || !alt.standard_spec_id) continue
    const price = getPrice(db, alt.supplier_id, alt.standard_spec_id)
    if (price) updateAlternativePrice(db, alt.id, price.unit_cost, price.lead_time_days)
  }

  if (match.status === "MATCHED") {
    const keptKeys = new Set(kept.map((k) => `${k.supplier_id ?? ""}|${k.standard_spec_id ?? ""}`))
    const offers = listOffersForSpec(db, match.toSpec.id)
      .filter((o) => !keptKeys.has(`${o.supplier_id}|${match.toSpec.id}`))
      .slice(0, MAX_OFFERS)

    for (const offer of offers) {
      insertAlternative(db, {
        bom_item_id: item.id,
        standard_spec_id: match.toSpec.id,
        supplier_id: offer.supplier_id,
        indian_standard_code: match.toSpec.code,
        unit_cost: offer.unit_cost,
        lead_time_days: offer.lead_time_days,
      })
    }

    if (offers.length === 0 && kept.length === 0) {
      insertAlternative(db, {
        bom_item_id: item.id,
        standard_spec_id: match.toSpec.id,
        supplier_id: null,
        indian_standard_code: match.toSpec.code,
        unit_cost: null,
        lead_time_days: null,
      })
    }
  }

  rerank(db, item.id)
}

/**
 * Matches the spec column first. If that finds nothing, looks for a standard reference or a
 * catalogued material grade (e.g. "16MnCr5") inside the description.
 */
export function findMatch(
  item: Pick<BomItem, "original_spec" | "part_name">,
  catalog: StandardsCatalog,
): { canonical: string; match: MatchResult } {
  const primary = item.original_spec ? canonicalizeSpec(item.original_spec) : ""
  const primaryMatch = primary ? matchEquivalent(primary, catalog) : null
  if (primaryMatch?.status === "MATCHED") return { canonical: primary, match: primaryMatch }

  const name = item.part_name ?? ""
  const candidates = [findStandardReference(name), ...name.split(/[\s,;/]+/)].filter((c): c is string => Boolean(c && c.length >= 4))
  for (const candidate of candidates) {
    const key = canonicalizeSpec(candidate)
    const match = matchEquivalent(key, catalog)
    if (match.status === "MATCHED") return { canonical: key, match }
  }
  return { canonical: primary, match: { status: "NEEDS_REVIEW" } }
}

export function rematchItemById(db: Db, itemId: string): void {
  transaction(db, () => {
    const item = getItem(db, itemId)
    if (!item) throw new Error("Line not found.")
    rematchItem(db, item, loadCatalog(db))
  })
}

export function rematchBom(db: Db, bomId: string): { lines: number; matched: number } {
  return transaction(db, () => {
    const catalog = loadCatalog(db)
    const items = listItems(db, bomId)
    for (const item of items) rematchItem(db, item, catalog)
    const after = listItems(db, bomId)
    return { lines: after.length, matched: after.filter((i) => i.match_status === "MATCHED").length }
  })
}

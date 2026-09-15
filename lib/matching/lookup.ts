import type { MatchResult, StandardSpec, StandardsCatalog } from "./types"

export type { StandardsCatalog, MatchResult } from "./types"

function specPrefix(canonicalItemKey: string): string {
  return canonicalItemKey.split("|")[0] ?? canonicalItemKey
}

export function findSpecByKey(canonicalItemKey: string, specs: StandardSpec[]): StandardSpec | undefined {
  const prefix = specPrefix(canonicalItemKey)
  return specs.find((s) => s.canonicalKey === prefix || canonicalItemKey.startsWith(s.canonicalKey))
}

export function matchEquivalent(canonicalItemKey: string, catalog: StandardsCatalog): MatchResult {
  const fromSpec = findSpecByKey(canonicalItemKey, catalog.specs)
  if (!fromSpec) return { status: "NEEDS_REVIEW" }

  const edges = catalog.equivalents.filter(
    (e) => e.fromSpecId === fromSpec.id && e.equivalence !== "NOT_EQUIVALENT",
  )
  const preferred = edges
    .map((e) => ({ edge: e, to: catalog.specs.find((s) => s.id === e.toSpecId) }))
    .filter((x): x is { edge: (typeof edges)[0]; to: StandardSpec } => Boolean(x.to))
    .sort((a, b) => Number(b.to.body === "IS") - Number(a.to.body === "IS"))

  const best = preferred[0]
  if (!best || best.edge.equivalence === "NOT_EQUIVALENT") return { status: "NEEDS_REVIEW" }

  return {
    status: "MATCHED",
    fromSpec,
    toSpec: best.to,
    equivalence: best.edge.equivalence,
  }
}

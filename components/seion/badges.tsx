import type { AlternativeStatus, BomStatus, CustomerStatus, Equivalence, MatchStatus, Origin, PriceSource, RfqStatus } from "@/lib/db/types"
import { BOM_STATUS_LABELS, CUSTOMER_STATUS_LABELS, DECISION_LABELS, EQUIVALENCE_LABELS, RECOMMENDATION_LABELS, RFQ_STATUS_LABELS } from "@/lib/labels"
import type { Recommendation } from "@/lib/validation/rules"
import { Badge, type Tone } from "./ui"

export function BomStatusBadge({ status }: { status: BomStatus }) {
  const tone: Record<BomStatus, Tone> = { PROCESSING: "blue", ANALYZED: "green", FAILED: "red" }
  return <Badge tone={tone[status]}>{BOM_STATUS_LABELS[status]}</Badge>
}

export function MatchBadge({ status }: { status: MatchStatus }) {
  return status === "MATCHED" ? <Badge tone="green">IS match</Badge> : <Badge tone="amber">Needs review</Badge>
}

export function EquivalenceBadge({ level }: { level: Equivalence | null }) {
  if (!level) return null
  const tone: Record<Equivalence, Tone> = { EQUIVALENT: "green", NEAR: "amber", NOT_EQUIVALENT: "red" }
  return <Badge tone={tone[level]}>{EQUIVALENCE_LABELS[level]}</Badge>
}

export function RecommendationBadge({ value }: { value: Recommendation }) {
  const tone: Record<Recommendation, Tone> = { SAFE_TO_SWITCH: "green", REQUIRES_TESTING: "amber", NOT_RECOMMENDED: "red" }
  return <Badge tone={tone[value]}>{RECOMMENDATION_LABELS[value]}</Badge>
}

export function DecisionBadge({ status }: { status: AlternativeStatus }) {
  const tone: Record<AlternativeStatus, Tone> = { SUGGESTED: "neutral", ACCEPTED: "blue", REJECTED: "red" }
  return <Badge tone={tone[status]}>{DECISION_LABELS[status]}</Badge>
}

export function CustomerBadge({ status }: { status: CustomerStatus }) {
  const tone: Record<CustomerStatus, Tone> = { NOT_SUBMITTED: "neutral", SUBMITTED: "blue", APPROVED: "green", REJECTED: "red" }
  return <Badge tone={tone[status]}>{CUSTOMER_STATUS_LABELS[status]}</Badge>
}

export function RfqStatusBadge({ status }: { status: RfqStatus }) {
  const tone: Record<RfqStatus, Tone> = { DRAFT: "neutral", SENT: "blue", QUOTED: "green", CLOSED: "neutral" }
  return <Badge tone={tone[status]}>{RFQ_STATUS_LABELS[status]}</Badge>
}

export function OriginBadge({ origin }: { origin: Origin }) {
  return origin === "SEED" ? (
    <Badge tone="neutral" title="Shipped with SEION as an indicative starting point. Verify before relying on it.">
      Seed
    </Badge>
  ) : (
    <Badge tone="blue" title="Added by your plant">
      Plant
    </Badge>
  )
}

export function PriceSourceBadge({ source }: { source: PriceSource | null }) {
  if (source === "RFQ") return <Badge tone="green">Quoted</Badge>
  if (source === "SEED") return <Badge tone="neutral" title="Illustrative seed price; replace via RFQ">Indicative</Badge>
  if (source === "MANUAL") return <Badge tone="blue">Price list</Badge>
  return null
}

export function CertBadges({ bis, iatf, iso }: { bis: string | null; iatf: boolean; iso: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {bis ? (
        <Badge tone="green" title={`BIS licence ${bis}`}>
          BIS ✓
        </Badge>
      ) : (
        <Badge tone="amber" title="No BIS licence recorded for this supplier">
          BIS ?
        </Badge>
      )}
      {iatf ? <Badge tone="green">IATF</Badge> : null}
      {iso ? <Badge tone="neutral">ISO 9001</Badge> : null}
    </span>
  )
}

import type { AlternativeStatus, BomStatus, CustomerStatus, Equivalence, RfqStatus } from "@/lib/db/types"
import type { Recommendation } from "@/lib/validation/rules"

export const BOM_STATUS_LABELS: Record<BomStatus, string> = {
  PROCESSING: "Processing",
  ANALYZED: "Analyzed",
  FAILED: "Failed",
}

export const DECISION_LABELS: Record<AlternativeStatus, string> = {
  SUGGESTED: "Suggested",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
}

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  NOT_SUBMITTED: "Not submitted",
  SUBMITTED: "Submitted to customer",
  APPROVED: "Customer approved",
  REJECTED: "Customer rejected",
}

export const EQUIVALENCE_LABELS: Record<Equivalence, string> = {
  EQUIVALENT: "Equivalent",
  NEAR: "Near",
  NOT_EQUIVALENT: "Not equivalent",
}

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  QUOTED: "Quoted",
  CLOSED: "Closed",
}

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  SAFE_TO_SWITCH: "Safe to switch",
  REQUIRES_TESTING: "Requires testing",
  NOT_RECOMMENDED: "Not recommended",
}

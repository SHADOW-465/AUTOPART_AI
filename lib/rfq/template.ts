import type { MechanicalFields, Settings } from "@/lib/db/types"
import { humanize } from "@/lib/validation/rules"

export type RfqTemplateInput = {
  rfqCode: string
  supplierName: string
  supplierContact: string | null
  isCode: string
  partFamily: string | null
  mechanical: MechanicalFields
  sourceSpec: string | null
  partName: string | null
  partNumber: string | null
  quantityPerVehicle: number
  annualVolume: number
  targetUnitCost: number | null
  coatingNote: string | null
  settings: Settings
}

export function rfqCode(now: Date = new Date(), random: () => number = Math.random): string {
  const yymmdd = now.toISOString().slice(2, 10).replaceAll("-", "")
  const suffix = Math.floor(random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0")
  return `RFQ-${yymmdd}-${suffix}`
}

function mechanicalLine(m: MechanicalFields): string | null {
  const parts = [
    m.property_class && `property class ${m.property_class}`,
    m.tensile_mpa_min != null && `tensile ≥ ${m.tensile_mpa_min} MPa`,
    m.yield_mpa_min != null && `yield ≥ ${m.yield_mpa_min} MPa`,
    m.hardness && `hardness ${m.hardness}`,
    m.thread_fit && `thread ${m.thread_fit}`,
  ].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

function inr(value: number): string {
  return `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function buildRfq(input: RfqTemplateInput): { subject: string; body: string } {
  const s = input.settings
  const part = [input.partName, input.partNumber && `(${input.partNumber})`].filter(Boolean).join(" ") || input.isCode
  const annualQty = input.quantityPerVehicle * input.annualVolume
  const company = s.company_name || "our plant"

  const lines: (string | null | false)[] = [
    `Dear ${input.supplierContact || `${input.supplierName} team`},`,
    "",
    `${company} requests a quotation for the following part, to be supplied to Indian Standard specification:`,
    "",
    `  Part:              ${part}`,
    input.sourceSpec && `  Current spec:      ${input.sourceSpec}`,
    `  Required standard: ${input.isCode}${input.partFamily ? ` (${humanize(input.partFamily)})` : ""}`,
    mechanicalLine(input.mechanical) && `  Properties:        ${mechanicalLine(input.mechanical)}`,
    input.coatingNote && `  Coating:           ${input.coatingNote}`,
    `  Quantity:          ${fmt(input.quantityPerVehicle)} per vehicle${annualQty > 0 ? `, approx. ${fmt(annualQty)} per year` : ""}`,
    input.targetUnitCost != null && `  Target price:      ${inr(input.targetUnitCost)} per unit`,
    s.plant_location && `  Delivery to:       ${s.plant_location}`,
    "",
    "Please include with your quotation:",
    "  1. Unit price (INR, ex-works and delivered) and price validity",
    "  2. BIS licence number (CM/L) for this product under the applicable Quality Control Order",
    "  3. Mill test certificate (EN 10204 type 3.1) for each lot",
    "  4. Readiness for PPAP level 3 submission and a copy of your IATF 16949 certificate",
    "  5. Lead time, MOQ and packing standard",
    "",
    `Please quote reference ${input.rfqCode} in your reply.`,
    "",
    "Regards,",
    s.contact_name || null,
    s.company_name || null,
    s.contact_phone || null,
    s.contact_email || null,
    s.gstin ? `GSTIN: ${s.gstin}` : null,
  ]

  return {
    subject: `${input.rfqCode}: ${input.isCode} – ${input.partName || input.isCode}`,
    body: lines.filter((l): l is string => typeof l === "string").join("\n"),
  }
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
}

const MAILTO_BODY_LIMIT = 1800

/** mailto: link; very long bodies are truncated because mail clients cap URL length. */
export function mailtoHref(email: string | null, subject: string, body: string): string {
  const truncated =
    body.length > MAILTO_BODY_LIMIT ? `${body.slice(0, MAILTO_BODY_LIMIT)}\n\n[Truncated – paste the full RFQ text copied from SEION]` : body
  return `mailto:${encodeURIComponent(email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(truncated)}`
}

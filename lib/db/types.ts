export type StandardBody = "DIN" | "ISO" | "IS" | "JIS" | "ASTM" | "SAE" | "AIS" | "EN"
export const STANDARD_BODIES: StandardBody[] = ["DIN", "ISO", "IS", "EN", "JIS", "SAE", "ASTM", "AIS"]

export type Equivalence = "EQUIVALENT" | "NEAR" | "NOT_EQUIVALENT"
export type Origin = "SEED" | "PLANT"
export type BomStatus = "PROCESSING" | "ANALYZED" | "FAILED"
export type MatchStatus = "MATCHED" | "NEEDS_REVIEW"
export type AlternativeStatus = "SUGGESTED" | "ACCEPTED" | "REJECTED"
export type CustomerStatus = "NOT_SUBMITTED" | "SUBMITTED" | "APPROVED" | "REJECTED"
export const CUSTOMER_STATUSES: CustomerStatus[] = ["NOT_SUBMITTED", "SUBMITTED", "APPROVED", "REJECTED"]
export type RfqStatus = "DRAFT" | "SENT" | "QUOTED" | "CLOSED"
export type PriceSource = "SEED" | "MANUAL" | "RFQ"

export type MechanicalFields = {
  property_class?: string
  tensile_mpa_min?: number
  yield_mpa_min?: number
  hardness?: string
  thread_fit?: string
}

export type Settings = {
  company_name: string
  plant_location: string
  contact_name: string
  contact_email: string
  contact_phone: string
  gstin: string
  default_annual_volume: number
}

export type StandardSpec = {
  id: string
  body: StandardBody
  code: string
  part_family: string
  canonical_key: string
  mechanical: MechanicalFields
  notes: string | null
  source_ref: string | null
  origin: Origin
  created_at: string
  updated_at: string
}

export type StandardEquivalentRow = {
  id: string
  from_spec_id: string
  to_spec_id: string
  equivalence: Equivalence
  notes: string | null
  source_ref: string | null
  origin: Origin
  created_at: string
}

export type Supplier = {
  id: string
  name: string
  industrial_hub: string | null
  state: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  bis_licence_no: string | null
  iatf_16949: boolean
  iso_9001: boolean
  rating: number | null
  lead_time_days: number | null
  notes: string | null
  origin: Origin
  created_at: string
  updated_at: string
}

export type SupplierPrice = {
  id: string
  supplier_id: string
  standard_spec_id: string
  unit_cost: number
  lead_time_days: number | null
  valid_until: string | null
  source: PriceSource
  updated_at: string
}

export type Bom = {
  id: string
  bom_code: string
  title: string
  customer_name: string | null
  vehicle_platform: string | null
  annual_volume: number
  status: BomStatus
  error_message: string | null
  source_filename: string | null
  source_mime: string | null
  created_at: string
  updated_at: string
}

export type BomItem = {
  id: string
  bom_id: string
  line_number: number
  part_number: string | null
  part_name: string | null
  category: string | null
  original_spec: string | null
  material: string | null
  canonical_spec_key: string | null
  quantity: number
  current_unit_cost: number | null
  current_supplier: string | null
  match_status: MatchStatus
  from_spec_id: string | null
  to_spec_id: string | null
  equivalence: "EQUIVALENT" | "NEAR" | null
  created_at: string
  updated_at: string
}

export type PartAlternative = {
  id: string
  bom_item_id: string
  standard_spec_id: string | null
  supplier_id: string | null
  indian_standard_code: string
  unit_cost: number | null
  lead_time_days: number | null
  rank_order: number
  status: AlternativeStatus
  customer_status: CustomerStatus
  customer_ref: string | null
  customer_notes: string | null
  decided_at: string | null
  customer_updated_at: string | null
  created_at: string
  updated_at: string
}

export type Rfq = {
  id: string
  rfq_code: string
  bom_id: string | null
  bom_item_id: string | null
  supplier_id: string | null
  standard_spec_id: string | null
  spec_code: string
  part_label: string | null
  supplier_name: string
  supplier_email: string | null
  annual_quantity: number | null
  target_unit_cost: number | null
  subject: string
  body: string
  status: RfqStatus
  sent_at: string | null
  quoted_unit_cost: number | null
  quoted_lead_time_days: number | null
  quote_valid_until: string | null
  quote_notes: string | null
  created_at: string
  updated_at: string
}

export type AuditEvent = {
  id: string
  bom_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  summary: string
  created_at: string
}

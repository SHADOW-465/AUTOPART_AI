import type { Role } from "@/lib/auth/roles"

export type { Role }

export type TierLevel = "TIER_1" | "TIER_2" | "TIER_3" | "JOB_SHOP"

export type BomStatus = "DRAFT" | "EXTRACTING" | "ANALYZED" | "FAILED" | "APPROVED"

export type MatchStatus = "MATCHED" | "NEEDS_REVIEW" | "CUSTOM"

export type StandardBody = "DIN" | "ISO" | "IS" | "JIS" | "ASTM" | "SAE" | "AIS" | "EN"

export type Equivalence = "EQUIVALENT" | "NEAR" | "NOT_EQUIVALENT"

export type AlternativeStatus = "SUGGESTED" | "ACCEPTED" | "REJECTED"

export type MaterialResult = "EQUIVALENT" | "SUPERIOR" | "INFERIOR" | "INCOMPATIBLE"

export type DimensionalFitResult = "INTERCHANGEABLE" | "REQUIRES_MODIFICATION" | "INCOMPATIBLE"

export type ValidationRecommendation = "SAFE_TO_SWITCH" | "REQUIRES_TESTING" | "NOT_RECOMMENDED"

export type MechanicalFields = {
  property_class?: string
  tensile_mpa_min?: number
  yield_mpa_min?: number
  hardness?: string
  thread_fit?: string
}

export type Tenant = {
  id: string
  name: string
  legal_entity_name: string | null
  gst_number: string | null
  tier_level: TierLevel
  industrial_cluster: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  tenant_id: string
  full_name: string | null
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Invite = {
  id: string
  tenant_id: string
  email: string
  role: Role
  token: string
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export type Bom = {
  id: string
  tenant_id: string
  bom_code: string
  title: string
  target_vehicle_platform: string | null
  currency: string
  status: BomStatus
  source_filename: string | null
  source_storage_path: string | null
  source_mime: string | null
  error_message: string | null
  total_original_cost: number | null
  total_optimized_cost: number | null
  total_savings_pct: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type BomItem = {
  id: string
  bom_id: string
  tenant_id: string
  line_number: number
  part_number: string | null
  part_name: string | null
  category: string | null
  original_spec: string | null
  canonical_spec_key: string | null
  material_grade: string | null
  quantity_per_vehicle: number
  current_unit_cost: number | null
  current_supplier_name: string | null
  match_status: MatchStatus
  extraction_confidence: number | null
  created_at: string
  updated_at: string
}

export type StandardSpecRow = {
  id: string
  body: StandardBody
  code: string
  part_family: string
  canonical_key: string
  mechanical: MechanicalFields
  notes: string | null
  created_at: string
  updated_at: string
}

export type StandardEquivalentRow = {
  id: string
  from_spec_id: string
  to_spec_id: string
  equivalence: Equivalence
  notes: string | null
  created_at: string
}

export type Supplier = {
  id: string
  legal_name: string
  brand_name: string | null
  industrial_hub: string
  state: string
  iatf_16949_certified: boolean
  iso_9001_certified: boolean
  rating: number
  average_lead_time_days: number
  created_at: string
  updated_at: string
}

export type SupplierCatalogPrice = {
  id: string
  supplier_id: string
  standard_spec_id: string
  unit_cost: number
  created_at: string
  updated_at: string
}

export type PartAlternative = {
  id: string
  bom_item_id: string
  tenant_id: string
  supplier_id: string | null
  standard_spec_id: string | null
  rank_order: number
  alternative_spec: string
  indian_standard_code: string
  alternative_unit_cost: number | null
  savings_percentage: number | null
  lead_time_days: number | null
  is_ais_compliant: boolean
  confidence_score: number | null
  status: AlternativeStatus
  created_at: string
  updated_at: string
}

export type TechnicalValidation = {
  id: string
  alternative_id: string
  tenant_id: string
  ai_engine: string
  material_composition_result: MaterialResult
  mechanical_properties_result: MaterialResult
  dimensional_fit_result: DimensionalFitResult
  recommendation: ValidationRecommendation
  validation_summary_markdown: string
  report_json: Record<string, unknown>
  validated_by: string | null
  validated_at: string
}

export type AuditEvent = {
  id: string
  tenant_id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

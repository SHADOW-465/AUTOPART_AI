import type { BomColumn } from "./types"

const SYNONYMS: Record<string, BomColumn> = {
  part: "part_name",
  partno: "part_number",
  partnumber: "part_number",
  pn: "part_number",
  oempn: "part_number",
  description: "part_name",
  item: "part_name",
  nomenclature: "part_name",
  spec: "original_spec",
  standard: "original_spec",
  materialspec: "original_spec",
  matl: "material",
  material: "material",
  qty: "quantity",
  qtyreq: "quantity",
  quantity: "quantity",
  rate: "unit_cost",
  unitcost: "unit_cost",
  price: "unit_cost",
  supplier: "supplier",
  vendor: "supplier",
  category: "category",
}

export function normalizeHeader(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function mapHeader(name: string): BomColumn | null {
  return SYNONYMS[normalizeHeader(name)] ?? null
}

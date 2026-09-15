export type BomColumn =
  | "part_number"
  | "part_name"
  | "original_spec"
  | "quantity"
  | "unit_cost"
  | "supplier"
  | "material"
  | "category"

export type RawBomRow = {
  sourceLine: number
  cells: Record<string, string>
}

export type NormalizedBomItem = {
  lineNumber: number
  partNumber: string
  partName: string
  originalSpec: string
  quantity: number
  unitCost: number | null
  supplier: string
  material: string
  category: string
}

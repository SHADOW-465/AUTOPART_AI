import type { BomColumn } from "./types"

const SYNONYMS: Record<string, BomColumn> = {}

function add(column: BomColumn, names: string[]) {
  for (const name of names) SYNONYMS[name] = column
}

add("part_number", [
  "part", "partno", "partnumber", "pn", "oempn", "oempartno", "itemno", "itemcode", "partcode",
  "drawingno", "drgno", "materialcode", "code", "customerpartno",
])
add("part_name", [
  "description", "item", "nomenclature", "partname", "partdescription", "name", "itemdescription",
  "desc", "component", "componentname", "itemname",
])
add("original_spec", [
  "spec", "specification", "standard", "materialspec", "matl", "std", "standardref", "stdref",
  "specref", "partspec", "standardno", "specno", "standardspec",
])
add("material", ["material", "materialgrade", "grade", "mat", "materialname"])
add("quantity", [
  "qty", "qtyreq", "quantity", "qtyveh", "qtypervehicle", "qtyperveh", "qtyset", "nos", "usage",
  "qtyassy", "qtyperassy", "reqqty",
])
add("unit_cost", [
  "rate", "unitcost", "price", "unitprice", "rateinr", "costinr", "unitrate", "cost", "priceinr",
  "landedcost", "unitcostinr", "unitpriceinr", "ratersunit", "rateperunit",
])
add("supplier", ["supplier", "vendor", "make", "currentsupplier", "source", "maker", "suppliername", "vendorname"])
add("category", ["category", "commodity", "type", "group", "partcategory", "commoditygroup", "family"])

export function normalizeHeader(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function mapHeader(name: string): BomColumn | null {
  return SYNONYMS[normalizeHeader(name)] ?? null
}

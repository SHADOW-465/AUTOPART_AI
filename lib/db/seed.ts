import type { Db } from "./client"
import type { Equivalence, MechanicalFields, StandardBody } from "./types"

type SeedSpec = [body: StandardBody, code: string, family: string, key: string, mechanical: MechanicalFields, notes: string]

const M88 = { property_class: "8.8", tensile_mpa_min: 800, yield_mpa_min: 640, thread_fit: "6g" }
const M109 = { property_class: "10.9", tensile_mpa_min: 1040, yield_mpa_min: 940, thread_fit: "6g" }

export const SEED_SPECS: SeedSpec[] = [
  ["DIN", "DIN 912", "hex_socket_cap_screw", "DIN912", M88, "Hex socket head cap screw"],
  ["ISO", "ISO 4762", "hex_socket_cap_screw", "ISO4762", M88, "Hex socket head cap screw"],
  ["IS", "IS 1367 Part 3", "hex_socket_cap_screw", "IS1367PART3", M88, "Mechanical properties of fasteners; pair with IS 2269 product standard"],
  ["IS", "IS 2269", "hex_socket_cap_screw", "IS2269", M88, "Hexagon socket head cap screws"],
  ["DIN", "DIN 931", "hex_head_bolt", "DIN931", M88, "Partial-thread hexagon head bolt"],
  ["DIN", "DIN 933", "hex_head_bolt", "DIN933", M88, "Full-thread hexagon head bolt"],
  ["ISO", "ISO 4014", "hex_head_bolt", "ISO4014", M88, "Partial-thread hexagon head bolt"],
  ["ISO", "ISO 4017", "hex_head_bolt", "ISO4017", M88, "Full-thread hexagon head screw"],
  ["IS", "IS 1364 Part 1", "hex_head_bolt", "IS1364PART1", M88, "Hexagon head bolts (product grade A and B)"],
  ["IS", "IS 1364 Part 2", "hex_head_bolt", "IS1364PART2", M88, "Hexagon head screws (product grade A and B)"],
  ["DIN", "DIN 934", "hex_nut", "DIN934", { property_class: "8", thread_fit: "6H" }, "Hexagon nut, style 1"],
  ["ISO", "ISO 4032", "hex_nut", "ISO4032", { property_class: "8", thread_fit: "6H" }, "Hexagon regular nuts (style 1)"],
  ["IS", "IS 1364 Part 3", "hex_nut", "IS1364PART3", { property_class: "8", thread_fit: "6H" }, "Hexagon nuts (product grade A and B)"],
  ["DIN", "DIN 125", "flat_washer", "DIN125", { hardness: "200 HV" }, "Plain washer Form A"],
  ["ISO", "ISO 7089", "flat_washer", "ISO7089", { hardness: "200 HV" }, "Plain washers, normal series, product grade A"],
  ["IS", "IS 2016", "flat_washer", "IS2016", { hardness: "200 HV" }, "Plain washers"],
  ["DIN", "DIN 127", "spring_lock_washer", "DIN127", { hardness: "44-51 HRC" }, "Spring lock washer Form B"],
  ["ISO", "ISO 6157", "spring_lock_washer", "ISO6157", { hardness: "44-51 HRC" }, "Surface discontinuities (paired with lock washers in seed matrix)"],
  ["IS", "IS 3063", "spring_lock_washer", "IS3063", { hardness: "44-51 HRC" }, "Single coil spring lock washers"],
  ["DIN", "DIN 7991", "countersunk_socket_bolt", "DIN7991", M109, "Hexagon socket countersunk head screw"],
  ["ISO", "ISO 10642", "countersunk_socket_bolt", "ISO10642", M109, "Hexagon socket countersunk head screws"],
  ["IS", "IS 6761", "countersunk_socket_bolt", "IS6761", M109, "Countersunk head screws"],
  ["DIN", "DIN 975", "threaded_rod", "DIN975", { property_class: "8.8", tensile_mpa_min: 800, thread_fit: "6g" }, "Threaded rod (metre lengths)"],
  ["DIN", "DIN 976", "threaded_rod", "DIN976", { property_class: "8.8", tensile_mpa_min: 800, thread_fit: "6g" }, "Stud bolts / threaded rod"],
  ["IS", "IS 1862", "threaded_rod", "IS1862", { property_class: "8.8", tensile_mpa_min: 800, thread_fit: "6g" }, "Studs"],
  ["EN", "EN 10130 FeP04", "cold_rolled_sheet", "EN10130", { tensile_mpa_min: 270, yield_mpa_min: 140 }, "Cold-rolled deep-drawing sheet"],
  ["IS", "IS 513 CR4/CR5", "cold_rolled_sheet", "IS513", { tensile_mpa_min: 270, yield_mpa_min: 140 }, "Cold-reduced low carbon steel sheet (CR4/CR5)"],
  ["DIN", "16MnCr5", "case_hardening_steel", "16MNCR5", { tensile_mpa_min: 800, yield_mpa_min: 590 }, "DIN 1.7131 case-hardening alloy steel"],
  ["IS", "IS 5517 16MnCr5", "case_hardening_steel", "IS551716MNCR5", { tensile_mpa_min: 800, yield_mpa_min: 590 }, "Steels for hardening and tempering, 16MnCr5"],
  ["DIN", "42CrMo4", "through_hardening_steel", "42CRMO4", { tensile_mpa_min: 900, yield_mpa_min: 650 }, "DIN 1.7225 through-hardening alloy steel"],
  ["IS", "IS 5517 40Cr4Mo2", "through_hardening_steel", "IS551740CR4MO2", { tensile_mpa_min: 900, yield_mpa_min: 650 }, "Steels for hardening and tempering, 40Cr4Mo2"],
  ["EN", "S235JR", "structural_steel", "S235JR", { tensile_mpa_min: 410, yield_mpa_min: 250 }, "EN 10025-2 structural steel"],
  ["IS", "IS 2062 E250", "structural_steel", "IS2062", { tensile_mpa_min: 410, yield_mpa_min: 250 }, "Hot-rolled structural steel, grade E250"],
  ["DIN", "55Cr3", "spring_steel", "55CR3", { tensile_mpa_min: 1350, yield_mpa_min: 1150, hardness: "spring" }, "DIN 1.7176 spring steel"],
  ["IS", "IS 4454 Part 1", "spring_steel", "IS4454PART1", { tensile_mpa_min: 1350, yield_mpa_min: 1150 }, "Steel wires for mechanical springs, unalloyed"],
  ["IS", "IS 1367 Part 11", "coating", "IS1367PART11", {}, "Zinc electroplate. Typical 72-120 h NSS. Not equivalent to zinc flake for underbody."],
  ["ISO", "ISO 10683", "coating", "ISO10683", {}, "Zinc-flake coating. Pair with IS 16647. Typical 480-1000 h NSS."],
  ["IS", "IS 16647", "coating", "IS16647", {}, "Zinc-flake coatings on fasteners. AIS-071/AIS-038 underbody often requires this class."],
  ["IS", "IS 3618", "coating", "IS3618", {}, "Phosphate coating (friction control / lubrication), not a zinc-flake substitute."],
]

export const SEED_EQUIVALENTS: [from: string, to: string, level: Equivalence, notes: string][] = [
  ["DIN912", "IS1367PART3", "EQUIVALENT", "DIN 912 → IS 1367 Part 3"],
  ["DIN912", "IS2269", "EQUIVALENT", "DIN 912 → IS 2269"],
  ["ISO4762", "IS1367PART3", "EQUIVALENT", "ISO 4762 → IS 1367 Part 3"],
  ["ISO4762", "IS2269", "EQUIVALENT", "ISO 4762 → IS 2269"],
  ["DIN931", "IS1364PART1", "EQUIVALENT", "DIN 931 → IS 1364 Part 1"],
  ["DIN931", "IS1364PART2", "NEAR", "Grouped with IS 1364 Part 1 & 2; check thread length"],
  ["DIN933", "IS1364PART2", "EQUIVALENT", "DIN 933 → IS 1364 Part 2"],
  ["DIN933", "IS1364PART1", "NEAR", "Grouped with IS 1364 Part 1 & 2; check thread length"],
  ["ISO4014", "IS1364PART1", "EQUIVALENT", "ISO 4014 → IS 1364 Part 1"],
  ["ISO4014", "IS1364PART2", "NEAR", "Grouped with IS 1364 Part 1 & 2; check thread length"],
  ["ISO4017", "IS1364PART2", "EQUIVALENT", "ISO 4017 → IS 1364 Part 2"],
  ["ISO4017", "IS1364PART1", "NEAR", "Grouped with IS 1364 Part 1 & 2; check thread length"],
  ["DIN934", "IS1364PART3", "EQUIVALENT", "DIN 934 → IS 1364 Part 3"],
  ["ISO4032", "IS1364PART3", "EQUIVALENT", "ISO 4032 → IS 1364 Part 3"],
  ["DIN125", "IS2016", "EQUIVALENT", "DIN 125 → IS 2016"],
  ["ISO7089", "IS2016", "EQUIVALENT", "ISO 7089 → IS 2016"],
  ["DIN127", "IS3063", "EQUIVALENT", "DIN 127 → IS 3063"],
  ["ISO6157", "IS3063", "NEAR", "Seed matrix pairs ISO 6157 with IS 3063"],
  ["DIN7991", "IS6761", "EQUIVALENT", "DIN 7991 → IS 6761"],
  ["ISO10642", "IS6761", "EQUIVALENT", "ISO 10642 → IS 6761"],
  ["DIN975", "IS1862", "EQUIVALENT", "DIN 975 → IS 1862"],
  ["DIN976", "IS1862", "EQUIVALENT", "DIN 976 → IS 1862"],
  ["EN10130", "IS513", "EQUIVALENT", "EN 10130 FeP04 → IS 513 CR4/CR5"],
  ["16MNCR5", "IS551716MNCR5", "EQUIVALENT", "16MnCr5 → IS 5517 16MnCr5"],
  ["42CRMO4", "IS551740CR4MO2", "NEAR", "42CrMo4 → IS 5517 40Cr4Mo2; confirm hardenability band"],
  ["S235JR", "IS2062", "EQUIVALENT", "S235JR → IS 2062 E250"],
  ["55CR3", "IS4454PART1", "NEAR", "55Cr3 → IS 4454 Part 1; confirm wire vs bar form"],
  ["ISO10683", "IS16647", "EQUIVALENT", "Zinc flake: ISO 10683 ↔ IS 16647"],
  ["IS1367PART11", "IS16647", "NOT_EQUIVALENT", "Electro-zinc is not a zinc-flake substitute for underbody NSS"],
]

type SeedSupplier = { name: string; hub: string; state: string; email: string; iatf: boolean; iso: boolean; rating: number; lead: number }

export const SEED_SUPPLIERS: SeedSupplier[] = [
  { name: "ChennaiFasteners (seed)", hub: "Chennai", state: "Tamil Nadu", email: "sales@chennaifasteners.example", iatf: true, iso: true, rating: 4.7, lead: 7 },
  { name: "IndiaFasteners (seed)", hub: "Pune", state: "Maharashtra", email: "rfq@indiafasteners.example", iatf: true, iso: true, rating: 4.6, lead: 10 },
  { name: "PuneFab (seed)", hub: "Pune", state: "Maharashtra", email: "sales@punefab.example", iatf: true, iso: true, rating: 4.4, lead: 11 },
  { name: "MumbaiSteel (seed)", hub: "Mumbai", state: "Maharashtra", email: "orders@mumbaisteel.example", iatf: true, iso: true, rating: 4.5, lead: 14 },
  { name: "TN Stamping (seed)", hub: "Chennai", state: "Tamil Nadu", email: "enquiry@tnstamping.example", iatf: false, iso: true, rating: 4.2, lead: 12 },
  { name: "Manesar Forge (seed)", hub: "Manesar", state: "Haryana", email: "sales@manesarforge.example", iatf: true, iso: true, rating: 4.3, lead: 9 },
]

/** Indicative INR unit prices, clearly labelled as seed data in the UI. */
export const SEED_PRICES: [supplier: string, specKey: string, unitCost: number][] = [
  ...(
    [
      ["IS1367PART3", 4.5, 4.8, 5.05],
      ["IS2269", 4.6, 4.9, 5.15],
      ["IS1364PART1", 3.2, 3.45, 3.6],
      ["IS1364PART2", 3.1, 3.35, 3.5],
      ["IS1364PART3", 1.15, 1.25, 1.3],
      ["IS2016", 0.35, 0.4, 0.42],
      ["IS3063", 0.48, 0.52, 0.55],
      ["IS6761", 5.1, 5.4, 5.6],
      ["IS1862", 12, 12.8, 13.2],
    ] as const
  ).flatMap(([key, a, b, c]) => [
    ["ChennaiFasteners (seed)", key, a] as [string, string, number],
    ["IndiaFasteners (seed)", key, b] as [string, string, number],
    ["PuneFab (seed)", key, c] as [string, string, number],
  ]),
  ["MumbaiSteel (seed)", "IS513", 68],
  ["TN Stamping (seed)", "IS513", 71],
  ["Manesar Forge (seed)", "IS551716MNCR5", 118],
  ["Manesar Forge (seed)", "IS551740CR4MO2", 132],
]

export const DEFAULT_SETTINGS: Record<string, string> = {
  company_name: "",
  plant_location: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  gstin: "",
  default_annual_volume: "10000",
}

export function seedIfEmpty(db: Db): void {
  const specCount = (db.prepare("SELECT COUNT(*) AS n FROM standard_specs").get() as { n: number }).n
  const settingsCount = (db.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number }).n
  if (specCount > 0 || settingsCount > 0) return

  const now = new Date().toISOString()
  db.exec("BEGIN")
  try {
    const setting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) setting.run(key, value)

    const specIds = new Map<string, string>()
    const insertSpec = db.prepare(
      `INSERT INTO standard_specs (id, body, code, part_family, canonical_key, mechanical, notes, source_ref, origin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SEED', ?, ?)`,
    )
    for (const [body, code, family, key, mechanical, notes] of SEED_SPECS) {
      const id = crypto.randomUUID()
      specIds.set(key, id)
      insertSpec.run(id, body, code, family, key, JSON.stringify(mechanical), notes, "SEION seed catalog (indicative)", now, now)
    }

    const insertEq = db.prepare(
      `INSERT INTO standard_equivalents (id, from_spec_id, to_spec_id, equivalence, notes, source_ref, origin, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'SEED', ?)`,
    )
    for (const [from, to, level, notes] of SEED_EQUIVALENTS) {
      insertEq.run(crypto.randomUUID(), specIds.get(from)!, specIds.get(to)!, level, notes, "SEION seed catalog (indicative)", now)
    }

    const supplierIds = new Map<string, string>()
    const insertSupplier = db.prepare(
      `INSERT INTO suppliers (id, name, industrial_hub, state, email, iatf_16949, iso_9001, rating, lead_time_days, notes, origin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SEED', ?, ?)`,
    )
    for (const s of SEED_SUPPLIERS) {
      const id = crypto.randomUUID()
      supplierIds.set(s.name, id)
      insertSupplier.run(
        id, s.name, s.hub, s.state, s.email, s.iatf ? 1 : 0, s.iso ? 1 : 0, s.rating, s.lead,
        "Sample supplier for trying the workflow. Replace with your approved vendors.", now, now,
      )
    }

    const insertPrice = db.prepare(
      `INSERT INTO supplier_prices (id, supplier_id, standard_spec_id, unit_cost, lead_time_days, source, updated_at)
       VALUES (?, ?, ?, ?, NULL, 'SEED', ?)`,
    )
    for (const [supplier, key, cost] of SEED_PRICES) {
      insertPrice.run(crypto.randomUUID(), supplierIds.get(supplier)!, specIds.get(key)!, cost, now)
    }
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

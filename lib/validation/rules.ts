import type { MechanicalFields } from "@/lib/db/types"

export type CheckStatus = "pass" | "warn" | "fail"
export type Check = { id: string; label: string; status: CheckStatus; detail: string }
export type Recommendation = "SAFE_TO_SWITCH" | "REQUIRES_TESTING" | "NOT_RECOMMENDED"
export type MaterialResult = "EQUIVALENT" | "SUPERIOR" | "INFERIOR" | "INCOMPATIBLE"
export type DimensionalResult = "INTERCHANGEABLE" | "REQUIRES_MODIFICATION" | "INCOMPATIBLE"

export type SpecForValidation = {
  code: string
  partFamily: string
  mechanical: MechanicalFields
}

export type ValidationInput = {
  equivalence: "EQUIVALENT" | "NEAR" | "NOT_EQUIVALENT" | null
  from: SpecForValidation | null
  to: SpecForValidation | null
  /** The spec text as written on the customer BOM, used for coating keywords. */
  originalSpecText: string
  /** Property class written on the drawing (e.g. "10.9"), if any. */
  drawingGrade?: string | null
}

export type ValidationResult = {
  recommendation: Recommendation
  material: MaterialResult
  dimensional: DimensionalResult
  checks: Check[]
}

const COATING_KEYWORDS = /zinc[\s-]*flake|geomet|dacromet|delta[\s-]*protekt|iso\s*10683|ais[\s-]*0?71|ais[\s-]*0?38|\b720\s*h/i
const SUPERIOR_MARGIN = 1.05

/** Deterministic engineering check of a source spec against its Indian Standard replacement. */
export function validateSwap(input: ValidationInput): ValidationResult {
  const checks: Check[] = []
  const { from, to } = input

  if (!input.equivalence || input.equivalence === "NOT_EQUIVALENT" || !from || !to) {
    checks.push({
      id: "equivalence",
      label: "Standards equivalence",
      status: "fail",
      detail: "No equivalence is recorded for this spec. Add one in the Standards library after engineering review.",
    })
    return { recommendation: "NOT_RECOMMENDED", material: "INCOMPATIBLE", dimensional: "INCOMPATIBLE", checks }
  }

  checks.push(
    input.equivalence === "EQUIVALENT"
      ? { id: "equivalence", label: "Standards equivalence", status: "pass", detail: `${from.code} → ${to.code} is recorded as equivalent.` }
      : {
          id: "equivalence",
          label: "Standards equivalence",
          status: "warn",
          detail: `${from.code} → ${to.code} is recorded as near-equivalent. Verify drawing details (head form, thread length, product grade).`,
        },
  )

  const sameFamily = from.partFamily === to.partFamily
  checks.push({
    id: "family",
    label: "Part family",
    status: sameFamily ? "pass" : "fail",
    detail: sameFamily
      ? `Both are ${humanize(from.partFamily)}.`
      : `${humanize(from.partFamily)} vs ${humanize(to.partFamily)}: different part families.`,
  })

  const a = from.mechanical
  const b = to.mechanical
  let inferior = false
  let superior = false

  const classCheck = compareNumericText("property_class", "Property class", a.property_class, b.property_class)
  checks.push(classCheck.check)
  inferior ||= classCheck.lower
  superior ||= classCheck.higher

  if (input.drawingGrade) checks.push(drawingGradeCheck(input.drawingGrade, to))

  for (const [key, label] of [
    ["tensile_mpa_min", "Tensile strength (min)"],
    ["yield_mpa_min", "Yield strength (min)"],
  ] as const) {
    const result = compareMinimum(key, label, a[key], b[key])
    checks.push(result.check)
    inferior ||= result.lower
    if (key === "tensile_mpa_min") superior ||= result.higher
  }

  checks.push(compareText("hardness", "Hardness", a.hardness, b.hardness))
  checks.push(compareText("thread_fit", "Thread tolerance", a.thread_fit, b.thread_fit))

  const coatingRequired = COATING_KEYWORDS.test(input.originalSpecText)
  checks.push(
    coatingRequired
      ? {
          id: "coating",
          label: "Coating",
          status: "warn",
          detail:
            "Source spec calls for zinc-flake / high-NSS corrosion protection. Specify IS 16647 zinc-flake coating; IS 1367 Part 11 electro-zinc is not equivalent.",
        }
      : { id: "coating", label: "Coating", status: "pass", detail: "No special coating called out in the source spec." },
  )

  const statuses = checks.map((c) => c.status)
  const recommendation: Recommendation = statuses.includes("fail")
    ? "NOT_RECOMMENDED"
    : statuses.includes("warn")
      ? "REQUIRES_TESTING"
      : "SAFE_TO_SWITCH"

  const material: MaterialResult = !sameFamily ? "INCOMPATIBLE" : inferior ? "INFERIOR" : superior ? "SUPERIOR" : "EQUIVALENT"
  const dimensional: DimensionalResult = !sameFamily
    ? "INCOMPATIBLE"
    : input.equivalence === "EQUIVALENT"
      ? "INTERCHANGEABLE"
      : "REQUIRES_MODIFICATION"

  return { recommendation, material, dimensional, checks }
}

function drawingGradeCheck(grade: string, to: SpecForValidation): Check {
  const label = "Grade on drawing"
  const recorded = to.mechanical.property_class
  if (!recorded) {
    return { id: "drawing_grade", label, status: "warn", detail: `Drawing calls for class ${grade}; no class is recorded for ${to.code}. Specify ${grade} on the order and confirm on the MTC.` }
  }
  const required = Number.parseFloat(grade)
  const available = Number.parseFloat(recorded)
  if (Number.isFinite(required) && Number.isFinite(available) && required > available) {
    return {
      id: "drawing_grade",
      label,
      status: "warn",
      detail: `Drawing calls for class ${grade} but the library record for ${to.code} is ${recorded}. Order the IS part in class ${grade} and confirm on the mill test certificate.`,
    }
  }
  return pass("drawing_grade", label, `Class ${grade} on the drawing is covered by ${to.code} (${recorded}).`)
}

/** Property class from a canonical key such as "ISO4017|M10X30|10.9". */
export function gradeFromCanonical(key: string | null | undefined): string | null {
  return key?.split("|").find((part) => /^\d{1,2}\.\d$/.test(part)) ?? null
}

function compareNumericText(id: string, label: string, from?: string, to?: string) {
  if (!from || !to) {
    return { check: missing(id, label, from, to), lower: false, higher: false }
  }
  const x = Number.parseFloat(from)
  const y = Number.parseFloat(to)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { check: compareText(id, label, from, to), lower: false, higher: false }
  }
  if (y < x) return { check: fail(id, label, `${to} is lower than the required ${from}.`), lower: true, higher: false }
  if (y > x) return { check: pass(id, label, `${to} exceeds ${from}. Check hydrogen embrittlement risk if electroplated.`), lower: false, higher: true }
  return { check: pass(id, label, `${from} on both.`), lower: false, higher: false }
}

function compareMinimum(id: string, label: string, from?: number, to?: number) {
  if (from == null || to == null) return { check: missing(id, label, from, to), lower: false, higher: false }
  if (to < from) return { check: fail(id, label, `${to} MPa is below the required ${from} MPa.`), lower: true, higher: false }
  return {
    check: pass(id, label, to === from ? `${from} MPa on both.` : `${to} MPa meets the required ${from} MPa.`),
    lower: false,
    higher: to >= from * SUPERIOR_MARGIN,
  }
}

function compareText(id: string, label: string, from?: string, to?: string): Check {
  if (!from && !to) return pass(id, label, "Not specified on either standard.")
  if (!from || !to) return missing(id, label, from, to)
  if (from.trim().toLowerCase() === to.trim().toLowerCase()) return pass(id, label, `${from} on both.`)
  return { id, label, status: "warn", detail: `${from} vs ${to}: confirm by test or drawing review.` }
}

function missing(id: string, label: string, from?: unknown, to?: unknown): Check {
  if (from == null && to == null) return pass(id, label, "Not specified on either standard.")
  const side = from == null ? "source" : "Indian Standard"
  return { id, label, status: "warn", detail: `Not recorded for the ${side} spec. Confirm from the standard or a mill test certificate.` }
}

function pass(id: string, label: string, detail: string): Check {
  return { id, label, status: "pass", detail }
}

function fail(id: string, label: string, detail: string): Check {
  return { id, label, status: "fail", detail }
}

export function humanize(value: string): string {
  return value.replaceAll("_", " ")
}

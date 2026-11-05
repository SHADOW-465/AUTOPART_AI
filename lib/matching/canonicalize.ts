const GRADE = /\b(?:grade\s*)?(\d{1,2}\.\d)\b/i
const BODY = /(?:^| )(DIN|ISO|IS|JIS|ASTM|SAE|AIS|EN) ?(\d+(?: PART \d+)?)/

/**
 * Reduces a free-text spec to "BODYNUMBER|SIZE|GRADE", e.g. "DIN 912 M6x20 8.8" → "DIN912|M6X20|8.8".
 * The first segment is what the standards table is keyed on.
 */
export function canonicalizeSpec(input: string): string {
  const upper = input
    .trim()
    .toUpperCase()
    .replace(/×/g, "X")
    // Indian Standard parts: "IS 1364-2", "IS 1364 (Part 2)" → "IS 1364 PART 2"
    .replace(/\bIS\s*(\d+)\s*(?:-|\(\s*)(?:PART\s*)?(\d+)\s*\)?/g, "IS $1 PART $2")
  const compact = upper
    .replace(/[^A-Z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // Adopted standards: DIN EN ISO 4017 is ISO 4017; DIN EN 10130 is EN 10130.
    .replace(/\b(?:DIN )?(?:EN )?ISO\b/g, "ISO")
    .replace(/\bDIN EN\b/g, "EN")

  const bodyMatch = compact.match(BODY)
  const body = bodyMatch ? `${bodyMatch[1]}${bodyMatch[2].replace(/\s+/g, "")}` : (compact.split(" ")[0] ?? "")

  const sizeMatch = upper.match(/M\s*\d+\s*X\s*\d+(?:\.\d+)?/)
  const size = sizeMatch ? sizeMatch[0].replace(/\s+/g, "") : ""

  const gradeMatch = compact.match(GRADE)
  const grade = gradeMatch ? gradeMatch[1] : ""

  return [body, size, grade].filter(Boolean).join("|")
}

const GRADE = /\b(?:grade\s*)?(\d+\.\d+)\b/i

export function canonicalizeSpec(input: string): string {
  const raw = input.trim().toUpperCase()
  const compact = raw.replace(/[^A-Z0-9.]+/g, " ").replace(/\s+/g, " ").trim()

  const bodyMatch = compact.match(/^(DIN|ISO|IS|JIS|ASTM|SAE|AIS|EN)\s*([0-9]+(?:\s*PART\s*\d+)?)/i)
  const body = bodyMatch
    ? `${bodyMatch[1]}${bodyMatch[2].replace(/\s+/g, "")}`.toUpperCase()
    : compact.split(" ")[0]

  const sizeMatch = input.toUpperCase().replace(/×/g, "X").match(/M\s*\d+\s*X\s*\d+(?:\.\d+)?/)
  const size = sizeMatch ? sizeMatch[0].replace(/\s+/g, "") : ""

  const gradeMatch = compact.match(GRADE)
  const grade = gradeMatch ? gradeMatch[1] : ""

  return [body, size, grade].filter(Boolean).join("|")
}

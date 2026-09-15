export type StandardBody = "DIN" | "ISO" | "IS" | "JIS" | "ASTM" | "SAE" | "AIS" | "EN"

export type StandardSpec = {
  id: string
  body: StandardBody
  code: string
  partFamily: string
  canonicalKey: string
}

export type StandardEquivalent = {
  fromSpecId: string
  toSpecId: string
  equivalence: "EQUIVALENT" | "NEAR" | "NOT_EQUIVALENT"
}

export type StandardsCatalog = {
  specs: StandardSpec[]
  equivalents: StandardEquivalent[]
}

export type MatchResult =
  | {
      status: "MATCHED"
      fromSpec: StandardSpec
      toSpec: StandardSpec
      equivalence: "EQUIVALENT" | "NEAR"
    }
  | { status: "NEEDS_REVIEW" }

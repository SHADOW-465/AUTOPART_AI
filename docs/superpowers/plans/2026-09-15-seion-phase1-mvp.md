# SEION AutoPart AI Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock SEION demo with a greenfield Next.js plant MVP: invite-only auth, Excel/CSV/text-PDF BOM upload, seeded DIN→IS matching, Groq extract/validate/RFQ, real savings.

**Architecture:** Next.js 16 App Router on Vercel; Supabase Auth + Postgres RLS + Storage; server-only Groq (`openai/gpt-oss-20b` extract/RFQ, `openai/gpt-oss-120b` validate); deterministic `standard_equivalents` table is the source of truth for IS codes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, pnpm, Vitest, ExcelJS, pdf-parse, groq-sdk, @supabase/ssr, @supabase/supabase-js, Zod, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-15-seion-phase1-mvp-design.md`

## Global Constraints

- Package manager is **pnpm** (existing `pnpm-lock.yaml`).
- AI key is **`GROQ_API_KEY` only**, server-side. Never `NEXT_PUBLIC_GROQ_*` or Gemini/xAI keys.
- Extract + RFQ model: **`openai/gpt-oss-20b`**. Metallurgy model: **`openai/gpt-oss-120b`**.
- Groq extract uses `response_format.json_schema` with `strict: true`. Chunk at most **20 lines** per call.
- Equivalents come from the seeded table. Groq must not invent IS codes.
- Visual language: existing `--color-brand-*` tokens in `app/globals.css`. New screens use `lucide-react`, not `components/lucide-icon.tsx`.
- TypeScript `strict: true`. Turn off `typescript.ignoreBuildErrors` before calling the work done.
- Roles: `plant_admin` | `procurement_engineer` | `quality_manager` with the spec’s permission matrix.
- One seeded tenant. Tests must also create a second tenant and prove RLS isolation.
- Do not implement CAD, scanned OCR, Redis, WhatsApp, supplier portal, PPAP, ERP, or SAML.

---

## File map

| Path | Responsibility |
|---|---|
| `vitest.config.ts` | Node test runner |
| `lib/matching/canonicalize.ts` | Spec string → canonical key |
| `lib/matching/lookup.ts` | In-memory equivalent lookup used by tests and by the matcher |
| `lib/boms/totals.ts` | Original / optimized / savings % |
| `lib/ingestion/types.ts` | `RawBomRow`, `NormalizedBomItem` |
| `lib/ingestion/headers.ts` | Synonym map + optional Groq header map merge |
| `lib/ingestion/csv.ts` | CSV → raw rows |
| `lib/ingestion/excel.ts` | XLSX → raw rows |
| `lib/ingestion/pdf.ts` | Text-layer PDF → raw rows or typed failure |
| `lib/ingestion/chunk.ts` | `chunkRows(rows, 20)` |
| `lib/groq/client.ts` | Server Groq client |
| `lib/groq/extract.ts` | Structured extract |
| `lib/groq/validate.ts` | Metallurgy JSON |
| `lib/groq/rfq.ts` | RFQ email text |
| `lib/auth/roles.ts` | `canUpload`, `canInvite`, `canAccept`, `canValidate`, `canDraftRfq` |
| `lib/auth/session.ts` | `requireUser`, `requireRole` |
| `lib/supabase/{client,server,admin,middleware}.ts` | Supabase clients |
| `lib/db/types.ts` | Row types matching SQL |
| `lib/actions/*.ts` | Server actions |
| `supabase/migrations/20260915120000_init.sql` | Schema + RLS |
| `supabase/seed.sql` | One tenant, specs, equivalents, suppliers |
| `app/login`, `app/invite/[token]`, `app/app/*` | Routes |
| `components/seion/*` | Feature UI |
| `tests/fixtures/messy.csv` | Odd headers |

**Delete after replacements exist:** `lib/gemini.ts`, `components/landing-page.tsx`, `components/dashboard-layout.tsx`, `components/dashboard-view.tsx`, `components/results-view.tsx`, `components/savings-view.tsx`, `components/ai-modal.tsx`, `components/lucide-icon.tsx`.

---

### Task 1: Vitest + spec canonicalizer

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/matching/canonicalize.ts`
- Create: `lib/matching/canonicalize.test.ts`
- Modify: `package.json` (scripts + devDeps)

**Interfaces:**
- Consumes: nothing
- Produces: `canonicalizeSpec(input: string): string`

- [ ] **Step 1: Add Vitest**

```bash
pnpm add -D vitest
```

Replace `scripts` in `package.json` with:

```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "lint": "eslint .",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: { environment: "node", include: ["**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
})
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { canonicalizeSpec } from "./canonicalize"

describe("canonicalizeSpec", () => {
  it("normalizes DIN 912 M6x20 8.8", () => {
    expect(canonicalizeSpec("DIN 912 M6x20 8.8")).toBe("DIN912|M6X20|8.8")
  })

  it("treats × and x as the same", () => {
    expect(canonicalizeSpec("DIN 912 M6×20 8.8")).toBe("DIN912|M6X20|8.8")
  })

  it("collapses extra space and punctuation", () => {
    expect(canonicalizeSpec("  din-912,  M6 x 20  grade 8.8 ")).toBe("DIN912|M6X20|8.8")
  })

  it("keeps IS codes", () => {
    expect(canonicalizeSpec("IS 1367 (Part 3) M6x20 8.8")).toBe("IS1367PART3|M6X20|8.8")
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test lib/matching/canonicalize.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 4: Implement**

```ts
const BODY = /^(DIN|ISO|IS|JIS|ASTM|SAE|AIS|EN)/i
const SIZE = /\bM\s*\d+\s*[x×]\s*\d+(?:\.\d+)?\b/i
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
```

If IS Part handling needs a tweak so tests pass, adjust the body regex until all four cases pass — do not weaken the tests.

- [ ] **Step 5: Run tests**

Run: `pnpm test lib/matching/canonicalize.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml lib/matching/canonicalize.ts lib/matching/canonicalize.test.ts
git commit -m "test: add spec canonicalizer for DIN/IS keys"
```

---

### Task 2: Equivalent lookup

**Files:**
- Create: `lib/matching/types.ts`
- Create: `lib/matching/lookup.ts`
- Create: `lib/matching/lookup.test.ts`

**Interfaces:**
- Consumes: `canonicalizeSpec`
- Produces: `matchEquivalent(canonicalKey, catalog): MatchResult` where `MatchResult` is `{ status: "MATCHED" | "NEEDS_REVIEW"; fromSpec?: StandardSpec; toSpec?: StandardSpec; equivalence?: "EQUIVALENT" | "NEAR" }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { canonicalizeSpec } from "./canonicalize"
import { matchEquivalent, type StandardsCatalog } from "./lookup"

const catalog: StandardsCatalog = {
  specs: [
    {
      id: "din-912",
      body: "DIN",
      code: "DIN 912",
      partFamily: "hex_socket_cap_screw",
      canonicalKey: "DIN912",
    },
    {
      id: "is-1367-3",
      body: "IS",
      code: "IS 1367 Part 3",
      partFamily: "hex_socket_cap_screw",
      canonicalKey: "IS1367PART3",
    },
  ],
  equivalents: [
    { fromSpecId: "din-912", toSpecId: "is-1367-3", equivalence: "EQUIVALENT" },
  ],
}

describe("matchEquivalent", () => {
  it("maps DIN 912 to IS 1367 Part 3", () => {
    const key = canonicalizeSpec("DIN 912 M6x20 8.8")
    const result = matchEquivalent(key, catalog)
    expect(result.status).toBe("MATCHED")
    expect(result.toSpec?.code).toBe("IS 1367 Part 3")
    expect(result.equivalence).toBe("EQUIVALENT")
  })

  it("flags unknown specs", () => {
    const result = matchEquivalent(canonicalizeSpec("CUSTOM BRACKET 400MPA"), catalog)
    expect(result.status).toBe("NEEDS_REVIEW")
    expect(result.toSpec).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm test lib/matching/lookup.test.ts`

- [ ] **Step 3: Implement types + lookup**

`lib/matching/types.ts`:

```ts
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
```

`lib/matching/lookup.ts`:

```ts
import type { MatchResult, StandardSpec, StandardsCatalog } from "./types"

function specPrefix(canonicalItemKey: string): string {
  return canonicalItemKey.split("|")[0] ?? canonicalItemKey
}

export function findSpecByKey(canonicalItemKey: string, specs: StandardSpec[]): StandardSpec | undefined {
  const prefix = specPrefix(canonicalItemKey)
  return specs.find((s) => s.canonicalKey === prefix || canonicalItemKey.startsWith(s.canonicalKey))
}

export function matchEquivalent(canonicalItemKey: string, catalog: StandardsCatalog): MatchResult {
  const fromSpec = findSpecByKey(canonicalItemKey, catalog.specs)
  if (!fromSpec) return { status: "NEEDS_REVIEW" }

  const edges = catalog.equivalents.filter(
    (e) => e.fromSpecId === fromSpec.id && e.equivalence !== "NOT_EQUIVALENT",
  )
  const preferred = edges
    .map((e) => ({ edge: e, to: catalog.specs.find((s) => s.id === e.toSpecId) }))
    .filter((x): x is { edge: (typeof edges)[0]; to: StandardSpec } => Boolean(x.to))
    .sort((a, b) => Number(b.to.body === "IS") - Number(a.to.body === "IS"))

  const best = preferred[0]
  if (!best || best.edge.equivalence === "NOT_EQUIVALENT") return { status: "NEEDS_REVIEW" }

  return {
    status: "MATCHED",
    fromSpec,
    toSpec: best.to,
    equivalence: best.edge.equivalence,
  }
}
```

Re-export types from `lookup.ts` if the test imports them there:

```ts
export type { StandardsCatalog, MatchResult } from "./types"
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test lib/matching`

- [ ] **Step 5: Commit**

```bash
git add lib/matching
git commit -m "feat: match DIN/ISO specs to seeded IS equivalents"
```

---

### Task 3: BOM totals

**Files:**
- Create: `lib/boms/totals.ts`
- Create: `lib/boms/totals.test.ts`

**Interfaces:**
- Produces: `computeBomTotals(items: TotalsItem[]): { totalOriginalCost: number; totalOptimizedCost: number; totalSavingsPct: number }`

`TotalsItem`:

```ts
export type TotalsItem = {
  quantity: number
  currentUnitCost: number | null
  acceptedAlternativeUnitCost: number | null
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { computeBomTotals } from "./totals"

describe("computeBomTotals", () => {
  it("uses accepted alternative cost when present", () => {
    const result = computeBomTotals([
      { quantity: 2500, currentUnitCost: 12.5, acceptedAlternativeUnitCost: 8.2 },
      { quantity: 5000, currentUnitCost: 3.2, acceptedAlternativeUnitCost: 1.5 },
    ])
    expect(result.totalOriginalCost).toBe(12.5 * 2500 + 3.2 * 5000)
    expect(result.totalOptimizedCost).toBe(8.2 * 2500 + 1.5 * 5000)
    expect(result.totalSavingsPct).toBeCloseTo(
      (100 * (result.totalOriginalCost - result.totalOptimizedCost)) / result.totalOriginalCost,
    )
  })

  it("keeps original cost when no alternative accepted", () => {
    const result = computeBomTotals([
      { quantity: 10, currentUnitCost: 5, acceptedAlternativeUnitCost: null },
    ])
    expect(result.totalOriginalCost).toBe(50)
    expect(result.totalOptimizedCost).toBe(50)
    expect(result.totalSavingsPct).toBe(0)
  })

  it("excludes lines with null original cost from percentage", () => {
    const result = computeBomTotals([
      { quantity: 10, currentUnitCost: null, acceptedAlternativeUnitCost: 1 },
      { quantity: 2, currentUnitCost: 10, acceptedAlternativeUnitCost: 4 },
    ])
    expect(result.totalOriginalCost).toBe(20)
    expect(result.totalOptimizedCost).toBe(8)
    expect(result.totalSavingsPct).toBe(60)
  })

  it("returns 0% when no priced original lines", () => {
    const result = computeBomTotals([
      { quantity: 1, currentUnitCost: null, acceptedAlternativeUnitCost: null },
    ])
    expect(result.totalOriginalCost).toBe(0)
    expect(result.totalOptimizedCost).toBe(0)
    expect(result.totalSavingsPct).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
export type TotalsItem = {
  quantity: number
  currentUnitCost: number | null
  acceptedAlternativeUnitCost: number | null
}

export function computeBomTotals(items: TotalsItem[]) {
  let totalOriginalCost = 0
  let totalOptimizedCost = 0

  for (const item of items) {
    if (item.currentUnitCost == null) continue
    const original = item.quantity * item.currentUnitCost
    const optimized =
      item.acceptedAlternativeUnitCost != null
        ? item.quantity * item.acceptedAlternativeUnitCost
        : original
    totalOriginalCost += original
    totalOptimizedCost += optimized
  }

  const totalSavingsPct =
    totalOriginalCost > 0 ? (100 * (totalOriginalCost - totalOptimizedCost)) / totalOriginalCost : 0

  return { totalOriginalCost, totalOptimizedCost, totalSavingsPct }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test lib/boms/totals.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/boms
git commit -m "feat: compute BOM original vs optimized totals"
```

---

### Task 4: Header synonyms + CSV parser

**Files:**
- Create: `lib/ingestion/types.ts`
- Create: `lib/ingestion/headers.ts`
- Create: `lib/ingestion/headers.test.ts`
- Create: `lib/ingestion/csv.ts`
- Create: `lib/ingestion/csv.test.ts`
- Create: `tests/fixtures/messy.csv`

**Interfaces:**
- Produces: `mapHeader(name: string): BomColumn | null`  
  `parseCsv(text: string): RawBomRow[]`  
  `BomColumn = "part_number" | "part_name" | "original_spec" | "quantity" | "unit_cost" | "supplier" | "material" | "category"`

- [ ] **Step 1: Write header tests**

```ts
import { describe, expect, it } from "vitest"
import { mapHeader } from "./headers"

describe("mapHeader", () => {
  it.each([
    ["Part No", "part_number"],
    ["OEM P/N", "part_number"],
    ["Description", "part_name"],
    ["Nomenclature", "part_name"],
    ["Matl.", "material"],
    ["Spec", "original_spec"],
    ["Qty Req.", "quantity"],
    ["Unit Cost", "unit_cost"],
    ["Rate", "unit_cost"],
    ["Finish", null],
  ] as const)("%s → %s", (input, expected) => {
    expect(mapHeader(input)).toBe(expected)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement types + headers**

```ts
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
```

```ts
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
```

- [ ] **Step 4: CSV fixture + parser**

`tests/fixtures/messy.csv`:

```csv
OEM P/N,Nomenclature,Matl.,Qty Req.,Rate
A-100,Hex Socket Bolt,DIN 912 M6x20 8.8,2500,12.50
A-101,Flat Washer,DIN 125 A M6,5000,3.20
```

`lib/ingestion/csv.ts`:

```ts
import { readFileSync } from "node:fs"
import { mapHeader } from "./headers"
import type { BomColumn, RawBomRow } from "./types"

export function parseCsv(text: string): RawBomRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const delimiter = lines[0].includes("\t") ? "\t" : ","
  const headers = splitCsvLine(lines[0], delimiter)
  const mapped = headers.map(mapHeader)
  const rows: RawBomRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i], delimiter)
    const cells: Record<string, string> = {}
    headers.forEach((h, idx) => {
      cells[h] = (values[idx] ?? "").trim()
    })
    const named: Partial<Record<BomColumn, string>> = {}
    mapped.forEach((col, idx) => {
      if (col) named[col] = (values[idx] ?? "").trim()
    })
    if (!named.part_name && !named.original_spec) continue
    rows.push({ sourceLine: i + 1, cells })
  }
  return rows
}

export function parseCsvFile(path: string): RawBomRow[] {
  return parseCsv(readFileSync(path, "utf8"))
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}
```

`lib/ingestion/csv.test.ts` — `parseCsvFile("tests/fixtures/messy.csv")` has length 2; first row cells include Hex Socket Bolt; second spec cell contains `DIN 125`.

- [ ] **Step 5: Run `pnpm test lib/ingestion` — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add lib/ingestion tests/fixtures/messy.csv
git commit -m "feat: map messy BOM headers and parse CSV"
```

---

### Task 5: Excel + PDF parsers

**Files:**
- Create: `lib/ingestion/excel.ts`
- Create: `lib/ingestion/excel.test.ts`
- Create: `lib/ingestion/pdf.ts`
- Create: `lib/ingestion/pdf.test.ts`
- Create: `lib/ingestion/chunk.ts`
- Create: `lib/ingestion/chunk.test.ts`

**Interfaces:**
- Produces: `parseXlsx(buffer: ArrayBuffer): Promise<RawBomRow[]>`  
  `parsePdf(buffer: ArrayBuffer): Promise<{ ok: true; rows: RawBomRow[] } | { ok: false; code: "NO_TEXT_LAYER" }>`  
  `chunkRows<T>(rows: T[], size?: number): T[][]` default size 20

- [ ] **Step 1: Add deps**

```bash
pnpm add exceljs pdf-parse
pnpm add -D @types/pdf-parse
```

- [ ] **Step 2: Excel test generates a workbook in-memory with ExcelJS (do not commit a binary). Headers: Part Description, Spec, Qty. One data row. Expect one RawBomRow.**

- [ ] **Step 3: Implement `parseXlsx`:** first sheet, scan first 20 rows for a row that maps ≥2 columns via `mapHeader`, remaining rows become `RawBomRow`.

- [ ] **Step 4: PDF tests**

1. Mock `pdf-parse` to return `{ text: "" }` → `NO_TEXT_LAYER`.
2. Mock text containing a header line `Part,Spec,Qty` and `Bolt,DIN 912 M6x20 8.8,10` → one row.

Implement `parsePdf` using `pdf-parse`. If `text.trim()` is empty, return `{ ok: false, code: "NO_TEXT_LAYER" }`. Otherwise split lines; treat the first line with ≥2 mapped headers as header; parse subsequent delimiter-separated lines (comma or 2+ spaces).

- [ ] **Step 5: `chunkRows`**

```ts
export function chunkRows<T>(rows: T[], size = 20): T[][] {
  if (size < 1) throw new Error("chunk size must be >= 1")
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}
```

Test: 45 rows → 3 chunks of 20, 20, 5.

- [ ] **Step 6: `pnpm test lib/ingestion` PASS, then commit**

```bash
git add lib/ingestion package.json pnpm-lock.yaml
git commit -m "feat: parse xlsx and text-layer PDF BOM tables"
```

---

### Task 6: Role guards

**Files:**
- Create: `lib/auth/roles.ts`
- Create: `lib/auth/roles.test.ts`

**Interfaces:**
- Produces: `Role = "plant_admin" | "procurement_engineer" | "quality_manager"`  
  `canInvite(role)`, `canUpload(role)`, `canAccept(role)`, `canValidate(role)`, `canDraftRfq(role)` all `boolean`

- [ ] **Step 1: Table-driven test matching the spec matrix**

```ts
import { describe, expect, it } from "vitest"
import { canAccept, canDraftRfq, canInvite, canUpload, canValidate, type Role } from "./roles"

const roles: Role[] = ["plant_admin", "procurement_engineer", "quality_manager"]

describe("role matrix", () => {
  it("invite", () => {
    expect(roles.map(canInvite)).toEqual([true, false, false])
  })
  it("upload", () => {
    expect(roles.map(canUpload)).toEqual([true, true, false])
  })
  it("accept", () => {
    expect(roles.map(canAccept)).toEqual([true, true, false])
  })
  it("validate", () => {
    expect(roles.map(canValidate)).toEqual([true, true, true])
  })
  it("rfq", () => {
    expect(roles.map(canDraftRfq)).toEqual([true, true, false])
  })
})
```

- [ ] **Step 2: Implement with a matrix object; functions only read it.**

- [ ] **Step 3: PASS + commit** `feat: encode plant role permission matrix`

---

### Task 7: Groq extract/validate/RFQ with mocked HTTP

**Files:**
- Create: `lib/groq/client.ts`
- Create: `lib/groq/schemas.ts`
- Create: `lib/groq/extract.ts`
- Create: `lib/groq/extract.test.ts`
- Create: `lib/groq/validate.ts`
- Create: `lib/groq/validate.test.ts`
- Create: `lib/groq/rfq.ts`
- Create: `lib/groq/rfq.test.ts`

**Interfaces:**
- Consumes: `NormalizedBomItem`, `chunkRows`
- Produces:
  - `getGroqClient(): Groq`
  - `extractItemsFromRows(rows: RawBomRow[]): Promise<NormalizedBomItem[]>`
  - `validateAlternative(input: ValidationInput): Promise<ValidationReport>`
  - `draftRfqEmail(input: RfqInput): Promise<string>`

- [ ] **Step 1: Add `groq-sdk` and `zod`**

```bash
pnpm add groq-sdk zod
```

- [ ] **Step 2: `client.ts` throws if `GROQ_API_KEY` missing. Do not read any `NEXT_PUBLIC_` key.**

```ts
import Groq from "groq-sdk"

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured")
  return new Groq({ apiKey })
}

export const EXTRACT_MODEL = "openai/gpt-oss-20b"
export const VALIDATE_MODEL = "openai/gpt-oss-120b"
export const RFQ_MODEL = "openai/gpt-oss-20b"
```

- [ ] **Step 3: Strict JSON schema for extract in `schemas.ts` — all fields required, `additionalProperties: false`. Items array of `{ line_number, part_number, part_name, original_spec, quantity, unit_cost, supplier, material, category }`.**

- [ ] **Step 4: Extract tests mock `getGroqClient` to return `chat.completions.create` that yields one JSON payload. Assert chunking: 25 rows → 2 create() calls. Empty part_name and original_spec are dropped. 429 on first call then success retries once (inject `retry-after: 0`).**

Implement extract with max 3 retries on status 429.

- [ ] **Step 5: Validate tests — mock 120b JSON with `SAFE_TO_SWITCH`. Zod-parse the result. Invalid JSON fails the promise.**

- [ ] **Step 6: RFQ tests — mock 20b plain text containing the spec and vendor name.**

- [ ] **Step 7: `pnpm test lib/groq` PASS + commit** `feat: Groq extract, validation, and RFQ adapters`

---

### Task 8: Supabase schema, RLS, seed

**Files:**
- Create: `supabase/migrations/20260915120000_init.sql`
- Create: `supabase/seed.sql`
- Create: `lib/db/types.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: physical tables matching the spec; TypeScript row types with the same names.

- [ ] **Step 1: Write migration SQL** (uuid-ossp, pgcrypto; all tenant tables with `tenant_id`; RLS policies `tenant_id = (select tenant_id from public.profiles where id = auth.uid())`; global read on `standard_specs`, `standard_equivalents`, `suppliers` for `authenticated`; `audit_events` insert by authenticated for own tenant, no update/delete).

Include `invites`, `boms` check constraint on status, `part_alternatives` status check, `technical_validations` enums as varchar + check.

Storage: create bucket `bom-uploads` private in the same migration via `storage.buckets` insert if not exists. Policy: authenticated users can insert/select objects whose first path folder equals their `tenant_id`.

- [ ] **Step 2: `seed.sql`** — one tenant `SEION Demo Plant`, Chennai, `TIER_2`. Insert `standard_specs` + `standard_equivalents` for every fastener and steel pair listed in spec §4.3. Insert the six seed suppliers with indicative fastener prices stored as rows you will join in app code (if no price table, put `indicative_unit_cost` numeric on `suppliers` is wrong — instead create `supplier_catalog_prices` `(supplier_id, standard_spec_id, unit_cost)` in this same migration so alternatives can be priced). **Add `supplier_catalog_prices` to the migration.** This is required by “savings where prices exist”.

- [ ] **Step 3: `lib/db/types.ts`** — exported types `Tenant`, `Profile`, `Invite`, `Bom`, `BomItem`, `StandardSpecRow`, `StandardEquivalentRow`, `Supplier`, `SupplierCatalogPrice`, `PartAlternative`, `TechnicalValidation`, `AuditEvent` matching columns.

- [ ] **Step 4: `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
SEED_ADMIN_EMAIL=
```

- [ ] **Step 5: Commit** `feat: add multi-tenant BOM schema, RLS, and IS seed data`

Do not put real secrets in git.

---

### Task 9: Supabase clients, middleware, session helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Create: `lib/auth/session.ts`
- Create: `lib/audit/log.ts`

**Interfaces:**
- Produces: `createClient()` browser; `createServerClient()` cookies; `createAdminClient()` service role; `updateSession(request)` for middleware; `requireUser(): Promise<{ user, profile }>` redirects to `/login`; `requireRole(roles: Role[])` redirects to `/forbidden`.

- [ ] **Step 1:**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

Use the official Next.js App Router cookie pattern from Supabase docs for `server.ts` and `middleware.ts`.

Protected prefixes: `/app`. Public: `/`, `/login`, `/invite`.

- [ ] **Step 2: `requireUser` loads `profiles` for `auth.uid()`. Missing profile → `/login`.**

- [ ] **Step 3: `logAudit({ action, entityType, entityId, metadata })` inserts into `audit_events` with tenant from profile. Swallow insert errors after `console.error` so UX is not blocked.**

- [ ] **Step 4: Commit** `feat: add Supabase session middleware and role gates`

---

### Task 10: Login + invite flow

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/login-form.tsx`
- Create: `app/invite/[token]/page.tsx`
- Create: `app/invite/[token]/invite-form.tsx`
- Create: `app/forbidden/page.tsx`
- Create: `lib/actions/auth.ts`
- Create: `lib/actions/invites.ts`

**Interfaces:**
- Produces: `loginAction(email, password)`  
  `acceptInviteAction(token, fullName, password)`  
  `createInviteAction(email, role)` (admin only) returns `{ inviteUrl: string }`

- [ ] **Step 1: `loginAction` uses `supabase.auth.signInWithPassword`. On success redirect `/app`. On error return `{ error: "Invalid email or password" }` (no user enumeration).**

- [ ] **Step 2: Invite accept:** validate token not expired (`expires_at > now()`, `accepted_at is null`); `admin.createUser({ email, password, email_confirm: true })`; insert `profiles` with invite role + tenant; set `accepted_at`; `signInWithPassword`; audit `invite.accepted`; redirect `/app`. Expired/used → render the spec’s copy: “Ask your Plant Admin to send a new invite”.

- [ ] **Step 3: `createInviteAction`:** `requireRole(["plant_admin"])`; insert invite `token = crypto.randomUUID()`, `expires_at = now+72h`; return origin + `/invite/` + token. Try `auth.admin.inviteUserByEmail` if available; always return the URL for copy-link.

- [ ] **Step 4: Pages use SEION brand classes (`bg-brand-dark` login, white card). No mock user.**

- [ ] **Step 5: Commit** `feat: invite-only email password auth`

---

### Task 11: Landing + authed app shell

**Files:**
- Create: `components/seion/logo.tsx`
- Create: `components/seion/app-shell.tsx`
- Modify: `app/page.tsx` (replace prototype switcher with public landing)
- Create: `app/app/layout.tsx`
- Create: `app/app/page.tsx` (stub dashboard: “Upload coming next” is **not** allowed — wait, dashboard upload is Task 13. For this task, shell + landing only; dashboard can show empty KPIs and a disabled dropzone labeled that upload ships in the next task? Spec says no placeholders. **Put a working layout and landing; dashboard page renders shell children only in later task.**)

This task: landing (real Login link to `/login`) + `app/app/layout.tsx` shell with nav: Dashboard `/app`, BOMs `/app/boms`, Savings `/app/savings`, Standards `/app/settings/standards`, Users `/app/settings/users` (link visible only if `canInvite`). Top bar shows `profile.full_name` and role. `/app/page.tsx` temporarily renders an empty dashboard frame with KPI zeros and no fake “127 BOMs”.

- [ ] **Step 1: Replace `app/page.tsx` with a server component landing. CTA → `/login`.**

- [ ] **Step 2: Shell uses `requireUser()`. Nav items as above. Users link if `canInvite(profile.role)`.**

- [ ] **Step 3: Delete `components/landing-page.tsx` and `components/dashboard-layout.tsx` after the new pages render.**

- [ ] **Step 4: Commit** `feat: replace demo switcher with landing and app shell`

---

### Task 12: BOM upload + process pipeline

**Files:**
- Create: `lib/actions/boms.ts`
- Create: `lib/boms/process.ts`
- Create: `lib/boms/process.test.ts`
- Create: `components/seion/upload-dropzone.tsx`
- Modify: `app/app/page.tsx`

**Interfaces:**
- Produces: `uploadBomAction(formData: FormData): Promise<{ bomId: string } | { error: string }>`  
  `processBom(bomId: string, tenantId: string, buffer: ArrayBuffer, mime: string, filename: string): Promise<void>`

`processBom` (pure-ish, inject parsers + groq + db):

1. Set status `EXTRACTING`
2. If extension `.xls` or `.step`/`.stp` → `FAILED` with spec messages
3. Parse csv/xlsx/pdf
4. PDF `NO_TEXT_LAYER` → `FAILED` “This PDF has no text layer. Export tables to Excel.”
5. Map headers; Groq extract in chunks; skip empty name+spec
6. For each item `canonicalizeSpec` + `matchEquivalent` against catalog loaded from DB
7. Insert `bom_items`, `part_alternatives` (up to 3 suppliers with catalog prices)
8. `computeBomTotals`, update BOM `ANALYZED`
9. On throw → `FAILED` + `error_message`

- [ ] **Step 1: Unit-test `processBom` with an in-memory fake db + mocked groq using `messy.csv` buffer. Assert 2 items, first MATCHED to IS 1367, custom unknown would be NEEDS_REVIEW — add a third fixture line `CUSTOM BRACKET` in the test buffer.**

- [ ] **Step 2: `uploadBomAction`:** `requireUser` + `canUpload` else throw forbidden. Max 10MB. Allowed mime/ext from spec. Insert BOM `DRAFT` then upload to `bom-uploads/{tenant_id}/{bom_id}/{filename}`. Call `processBom`. Audit `bom.uploaded`. Return `bomId`. Redirect to `/app/boms/[id]`.

- [ ] **Step 3: Dropzone on dashboard (client) posts FormData to the action; shows spinner “Extracting parts…”; no `setTimeout` fake delay.**

- [ ] **Step 4: Commit** `feat: upload and process BOM files into matched line items`

---

### Task 13: BOM list + detail + accept/reject

**Files:**
- Create: `app/app/boms/page.tsx`
- Create: `app/app/boms/[id]/page.tsx`
- Create: `components/seion/bom-table.tsx`
- Create: `components/seion/alternative-card.tsx`
- Create: `lib/actions/alternatives.ts`
- Delete: `components/results-view.tsx`, `components/dashboard-view.tsx`

**Interfaces:**
- Produces: `acceptAlternativeAction(alternativeId: string)` — rejects other alts on the same item, recomputes totals, audit `alternative.accepted`  
  `rejectAlternativeAction(alternativeId: string)`  
  `retryBomAction(bomId: string)` — re-download storage object, `processBom` again if status `FAILED`

- [ ] **Step 1: List page queries `boms` for tenant, newest first. Status badge. FAILED shows `error_message` snippet + Retry.**

- [ ] **Step 2: Detail page:** header totals, item table, select row, alternatives. Unmapped: amber “Needs review”, empty alt list. Accept button hidden if `!canAccept`.

- [ ] **Step 3: Accept one alternative per item (unique partial index or transactional reject-others).**

- [ ] **Step 4: Commit** `feat: BOM list, detail, and alternative acceptance`

---

### Task 14: Validation + RFQ panels

**Files:**
- Create: `components/seion/validation-panel.tsx`
- Create: `components/seion/rfq-panel.tsx`
- Create: `lib/actions/validation.ts`
- Create: `lib/actions/rfq.ts`
- Delete: `components/ai-modal.tsx`, `lib/gemini.ts`

**Interfaces:**
- Produces: `runValidationAction(alternativeId: string)` → inserts `technical_validations`, audit `validation.ran`  
  `draftRfqAction(alternativeId: string)` → returns email string, audit `rfq.drafted`

- [ ] **Step 1: Quality/Admin/Procurement can validate (`canValidate`). RFQ requires `canDraftRfq`.**

- [ ] **Step 2: Panel shows latest validation markdown + recommendation badge. Copy RFQ to clipboard.**

- [ ] **Step 3: Groq errors: 429 message “AI rate limit, wait a minute and retry.” 401 “AI is not configured.” Never show raw Groq body.**

- [ ] **Step 4: Commit** `feat: on-demand Groq metallurgy validation and RFQ draft`

---

### Task 15: Dashboard KPIs + savings

**Files:**
- Modify: `app/app/page.tsx`
- Create: `app/app/savings/page.tsx`
- Create: `lib/boms/kpis.ts`
- Create: `lib/boms/kpis.test.ts`
- Delete: `components/savings-view.tsx`

**Interfaces:**
- Produces: `computeKpis(boms, acceptedAlts): { monthlySavings, bomsProcessed, complianceRate, empty }`  
  Compliance rate = accepted AIS-compliant / accepted, or 0 if none.

- [ ] **Step 1: Tests for empty state and for two accepted alts (one AIS true, one false) → 50%.**

- [ ] **Step 2: Savings page uses Recharts already in the project. Data from accepted alternatives joined to items. Empty copy: “Accept alternatives on a BOM to see savings”.**

- [ ] **Step 3: Dashboard KPIs from the same helper. Recent BOMs = last 5 real rows. Never show ₹2,34,500 unless the tenant actually has that.**

- [ ] **Step 4: Commit** `feat: real dashboard KPIs and savings charts`

---

### Task 16: Settings — users + standards library

**Files:**
- Create: `app/app/settings/users/page.tsx`
- Create: `app/app/settings/standards/page.tsx`

- [ ] **Step 1: Users page `requireRole(["plant_admin"])`. Form email + role select. On success show invite URL in a copy field. List pending invites and profiles.**

- [ ] **Step 2: Standards page: table of `standard_equivalents` joined to from/to codes. Read-only. All roles.**

- [ ] **Step 3: Non-admin hitting users URL renders `app/forbidden/page.tsx` via `requireRole`.**

- [ ] **Step 4: Commit** `feat: admin invites and read-only standards library`

---

### Task 17: Prototype cleanup + production TypeScript

**Files:**
- Modify: `next.config.mjs` — remove `typescript.ignoreBuildErrors`
- Delete leftover prototype files listed in the file map
- Modify: `app/layout.tsx` metadata title stays SEION AutoPart AI
- Create: `README.md` at repo root if missing: how to set env, `pnpm test`, `pnpm dev`, link Groq key, link Supabase, run migration + seed

- [ ] **Step 1: `rg NEXT_PUBLIC_GEMINI|MOCK_BOM|callGemini|lucide-icon` returns no app/lib/components hits.**

- [ ] **Step 2: `pnpm test` all green. `pnpm build` with TypeScript errors not ignored.**

- [ ] **Step 3: Commit** `chore: remove demo mocks and fail the build on type errors`

---

### Task 18: Auth RLS isolation test (integration)

**Files:**
- Create: `lib/auth/rls.isolation.test.ts` — **skip if `SUPABASE_URL` not in env** (`describe.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)`).

When env present: using service role, create tenant A + user A, tenant B + user B, BOM on A; authenticate as B (or set `request.jwt` / use user-scoped client) and assert selecting `boms` returns 0.

- [ ] **Step 1: Write the test. Locally it should skip in CI without secrets and pass when secrets exist.**

- [ ] **Step 2: Commit** `test: skippable RLS isolation check across two tenants`

---

## Self-review vs spec

| Spec requirement | Task |
|---|---|
| Invite-only email/password | 10, 16 |
| Roles + matrix | 6, 9, 10, 12–16 |
| xlsx/csv/text PDF | 4, 5, 12 |
| Reject scanned PDF / STEP / xls | 5, 12 |
| Seeded equivalents, no invented IS | 2, 8, 12 |
| Groq 20b / 120b, server key, chunk 20, 429 retry | 7, 12, 14 |
| On-demand validation | 14 |
| RFQ copy not send | 14 |
| Real savings / KPIs | 3, 15 |
| RLS + second tenant test | 8, 18 |
| Greenfield routes, delete mocks | 11, 13, 17 |
| Standards library UI | 16 |
| Vercel + Supabase env | 8, 9, README in 17 |
| No CAD/WhatsApp/ERP/SAML/Redis | Global constraint; no task adds them |

No TBD left in tasks. `supplier_catalog_prices` was added so seed prices have a home — implement it in Task 8 as specified.

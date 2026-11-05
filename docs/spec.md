# Technical Spec — SEION AutoPart AI v1.0

Implements [prd.md](./prd.md). Build sequence is in [plan.md](./plan.md).

---

## 1. Architecture

```
Browser ──► Next.js 16 App Router (server components + server actions)
              │
              ├── lib/actions/*      server actions (validate input → repo → revalidate)
              ├── lib/repo/*         SQL repositories (synchronous, node:sqlite)
              ├── lib/db/*           connection, migrations, seed
              └── domain (pure, unit-tested)
                    lib/ingestion/*  csv / xlsx / pdf → RawBomRow → NormalizedBomItem
                    lib/matching/*   canonicalize + equivalence lookup
                    lib/validation/* rules engine (spec vs IS spec)
                    lib/boms/*       savings math, import + re-match pipeline, CSV export
                    lib/rfq/*        RFQ code, email template, mailto
                    lib/groq/*       OPTIONAL extraction fallback (GROQ_API_KEY)
```

- **One process, one SQLite file.** `DatabaseSync` from `node:sqlite` (Node ≥ 22.13, no native build). WAL mode, `foreign_keys=ON`. Connection cached on `globalThis` so dev hot-reload doesn't open new handles.
- **No auth, no middleware.** Every page sets `export const dynamic = "force-dynamic"` because it reads live DB state.
- **Mutations** are server actions. On success they call `revalidatePath("/", "layout")`, so whichever view is open re-renders with fresh data.
- **Engineering facts** come only from `standard_specs` and `standard_equivalents`. AI can only ever turn messy rows into line items, and only when headers can't be mapped and a key is set.

## 2. Data model (SQLite)

Migrations are an ordered array in `lib/db/schema.ts`, and `PRAGMA user_version` stores the applied count. IDs are `crypto.randomUUID()`. Timestamps are ISO-8601 UTC text. Money is `REAL` in INR.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `settings` | Key/value workspace settings | `key` PK, `value` |
| `standard_specs` | Standards catalog | `body` (DIN/ISO/IS/JIS/ASTM/SAE/AIS/EN), `code`, `part_family`, `canonical_key` UNIQUE, `mechanical` JSON, `notes`, `source_ref`, `origin` (SEED/PLANT) |
| `standard_equivalents` | Directed equivalence edges | `from_spec_id`→specs CASCADE, `to_spec_id`→specs CASCADE, `equivalence` (EQUIVALENT/NEAR/NOT_EQUIVALENT), `notes`, `source_ref`, `origin`; UNIQUE(from,to); CHECK from≠to |
| `suppliers` | Supplier directory | `name` UNIQUE, `industrial_hub`, `state`, `contact_name`, `email`, `phone`, `bis_licence_no`, `iatf_16949` 0/1, `iso_9001` 0/1, `rating`, `lead_time_days`, `notes`, `origin` |
| `supplier_prices` | Price list | `supplier_id` CASCADE, `standard_spec_id` CASCADE, `unit_cost` ≥ 0, `lead_time_days`, `valid_until`, `source` (SEED/MANUAL/RFQ); UNIQUE(supplier, spec) |
| `boms` | Uploaded BOMs | `bom_code` UNIQUE, `title`, `customer_name`, `vehicle_platform`, `annual_volume`, `status` (PROCESSING/ANALYZED/FAILED), `error_message`, `source_filename`, `source_mime`, `source_file` BLOB |
| `bom_items` | BOM lines | `bom_id` CASCADE, `line_number`, `part_number`, `part_name`, `category`, `original_spec`, `material`, `canonical_spec_key`, `quantity`, `current_unit_cost` (today's landed cost), `current_supplier`, `match_status` (MATCHED/NEEDS_REVIEW), `from_spec_id`, `to_spec_id` (SET NULL), `equivalence` |
| `part_alternatives` | IS alternatives per line | `bom_item_id` CASCADE, `standard_spec_id`, `supplier_id` (SET NULL; NULL = "no quote yet"), `indian_standard_code`, `unit_cost` NULL-able, `lead_time_days`, `rank_order`, `status` (SUGGESTED/ACCEPTED/REJECTED), `customer_status` (NOT_SUBMITTED/SUBMITTED/APPROVED/REJECTED), `customer_ref`, `customer_notes`, `decided_at`, `customer_updated_at`; **partial UNIQUE index: one ACCEPTED per item** |
| `rfqs` | RFQs and quotes | `rfq_code` UNIQUE, `bom_id`/`bom_item_id`/`supplier_id`/`standard_spec_id` (SET NULL), snapshots `spec_code`, `supplier_name`, `supplier_email`, `annual_quantity`, `target_unit_cost`, `subject`, `body`, `status` (DRAFT/SENT/QUOTED/CLOSED), `sent_at`, `quoted_unit_cost`, `quoted_lead_time_days`, `quote_valid_until`, `quote_notes` |
| `audit_events` | Activity log | `bom_id` CASCADE (nullable), `entity_type`, `entity_id`, `action`, `summary`, `created_at` |

**Derived, never stored:** savings %, per-vehicle and annual deltas, BOM totals, and validation results. They are computed on read from current rows, so they can't go stale.

**Seed (first run, empty DB only):**
- 39 specs and 29 equivalences ported from the Phase 1 seed. Fasteners: DIN 912/931/933/934/125/127/7991/975/976 and their ISO and IS counterparts. Steels: FeP04→IS 513, 16MnCr5, 42CrMo4, S235JR→IS 2062, 55Cr3. Coatings: zinc flake IS 16647 / ISO 10683, flagged.
- 6 suppliers and 31 indicative prices, all with `origin='SEED'` and labelled "indicative" in the UI. IS 2062 deliberately has no seed price, so the sample BOM demonstrates the "no quote yet → RFQ" path.
- Default settings.

## 3. Pipelines

### 3.1 Import (`lib/boms/import.ts`)
1. Validate the file: ≤ 4 MB (fits the 4.5 MB request cap on Vercel); ext ∈ {xlsx, csv, pdf}. `.xls` → "Save as .xlsx or CSV". `.step/.stp` → "CAD files not supported". Insert the BOM (`PROCESSING`) with the file bytes stored as a BLOB.
2. **Parse rows** with the existing parsers (csv / xlsx / pdf text layer). A PDF with no text layer → FAILED "scanned PDF – export the table to Excel".
3. **Normalize** (`lib/ingestion/normalize.ts`, deterministic):
   - Map headers via an extended synonym table (`part no`, `description`, `specification`, `std`, `qty/veh`, `unit price`, `rate (inr)`, `make`, `vendor`, `matl`, …).
   - `parseQuantity("4 nos") = 4`; `parseMoney("₹1,250.50") = 1250.5`, `"Rs. 3"` = 3; an empty or blank cost is `null`.
   - If the spec is empty, extract the first standard reference from the name or material using `/(DIN|ISO|IS|EN|JIS|SAE|ASTM)\s*\d+…/`.
   - Drop rows with neither a name nor a spec, and renumber lines 1..n.
4. If normalization yields 0 items **and** no usable header was found: with `GROQ_API_KEY`, use `extractItemsFromRows` (AI); without one, FAILED: "Couldn't find Part / Spec / Qty columns – use the BOM template".
5. **Insert lines and match each one** (§3.2) in one transaction. Status → `ANALYZED`. Audit `bom.imported`.

### 3.2 Line matching (`lib/boms/rematch.ts → rematchItem(db, itemId)`)
1. `canonical = canonicalizeSpec(original_spec)` → `matchEquivalent(canonical, catalog)`. The catalog is loaded once per batch. If the spec column doesn't match, the description is searched for a standard reference or a catalogued grade (e.g. "Gear blank 16MnCr5").
2. Update the item's `canonical_spec_key`, `match_status`, `from_spec_id`, `to_spec_id` and `equivalence`.
3. Delete the item's alternatives whose status is not `ACCEPTED`. ACCEPTED rows are plant decisions and are kept.
4. If MATCHED: offers = prices for `to_spec_id`, cheapest first, top 3, skipping any supplier+spec already kept as ACCEPTED.
   - If there are no offers and no kept alternative, insert one **spec-only** alternative (supplier NULL, cost NULL).
   - A kept ACCEPTED alternative has its `unit_cost` and lead time refreshed from the price list when a price exists.
5. Re-rank all alternatives on the item: priced ones by cost ascending, then unpriced.

The same function backs line edits, BOM re-match, standards/price changes (on user request) and RFQ quotes.

### 3.3 Validation rules engine (`lib/validation/rules.ts`, pure)

Input: `{ equivalence, from: Spec|null, to: Spec|null, originalSpecText }`. Output:
`{ recommendation, material, mechanical, dimensional, checks: {id,label,status:'pass'|'warn'|'fail',detail}[] }`.

| Check | Pass | Warn | Fail |
| --- | --- | --- | --- |
| Equivalence | EQUIVALENT | NEAR ("verify drawing: head / thread length / grade A-B") | missing / NOT_EQUIVALENT |
| Part family | same | — | different |
| Property class | equal or higher (numeric compare, e.g. 10.9 ≥ 8.8) | either side missing | lower |
| Tensile min (MPa) | to ≥ from | missing | to < from |
| Yield min (MPa) | to ≥ from | missing | to < from |
| Hardness | equal strings | differ or missing on one side | — |
| Thread fit | equal | differ or missing on one side | — |
| Coating | no coating keyword in source | source mentions zinc flake / Geomet / Dacromet / ISO 10683 / AIS-071 → "specify IS 16647 zinc-flake; IS 1367-11 electro-zinc is not equivalent" | — |

- **Recommendation:** any fail → NOT_RECOMMENDED; else any warn → REQUIRES_TESTING; else SAFE_TO_SWITCH.
- **Material / mechanical result:** INCOMPATIBLE (family fail), INFERIOR (a strength fail), SUPERIOR (to > from by ≥ 5% on tensile or a higher class), otherwise EQUIVALENT.
- **Dimensional:** EQUIVALENT → INTERCHANGEABLE; NEAR → REQUIRES_MODIFICATION; family mismatch → INCOMPATIBLE.
- A "PPAP: customer approval required before production use" note is always shown.

### 3.4 Savings (`lib/boms/savings.ts`, pure)
- `unitDelta = current − alt`, `pct = unitDelta / current × 100` (null if either cost is missing or current ≤ 0).
- `perVehicle = unitDelta × qty`, `annual = perVehicle × bom.annual_volume`.
- BOM summary:
  - `costPerVehicle` = Σ qty × current
  - `proposedCostPerVehicle` = the same, with each ACCEPTED alt's cost substituted
  - `proposedAnnual` = Σ annual over ACCEPTED alts whose customer status ≠ REJECTED
  - `approvedAnnual` = Σ annual over customer-APPROVED alts
  - counts: lines / matched / needs review / accepted / approved
- Workspace KPIs aggregate the BOM summaries. Monthly series are bucketed by `decided_at` (proposed) and `customer_updated_at` (approved).

### 3.5 RFQ (`lib/rfq/template.ts`, pure)
- `rfq_code = RFQ-YYMMDD-XXXX`.
- **Subject:** `RFQ {code}: {IS code} – {part name}`.
- **Body:**
  - greeting to the supplier contact
  - part, source spec and IS spec with family and mechanical properties
  - qty / vehicle, annual quantity and target price
  - required: BIS licence no. (QCO), mill test certificate (EN 10204 3.1), PPAP level 3, IATF 16949 certificate copy, lead time, MOQ, price validity
  - delivery to the plant location
  - signature: contact name, company, phone, email, GSTIN
- `mailtoHref(email, subject, body)`, encoded and capped at 1,800 characters (with a note that the full text was copied).
- **Quote recording:**
  1. upsert `supplier_prices` (source RFQ)
  2. status QUOTED
  3. `rematchItem` for the linked item, so the alternative is created or its cost refreshed

## 4. Routes

| Route | Type | Content |
| --- | --- | --- |
| `/` | page | Dashboard: KPIs, "Needs attention" (review lines, open RFQs, pending approvals), recent BOMs, upload |
| `/boms` | page | Upload, template / sample buttons, BOM table (code, title, customer, lines, match %, proposed and approved annual, status) |
| `/boms/[id]` | page | Header (editable meta + annual volume), summary stats, actions (re-match, re-import, proposal, CSV, delete), line table with filters (all / needs review / matched / accepted), line panel (edit, match, validation, alternatives + decisions, customer approval, RFQs), activity log |
| `/boms/[id]/export` | route | CSV proposal |
| `/print/boms/[id]` | page (no shell) | Printable localization proposal pack |
| `/rfqs` | page | RFQ table with Open / All filter; row actions: copy, mailto, mark sent, record quote, close |
| `/suppliers` | page | Supplier table + add form |
| `/suppliers/[id]` | page | Edit supplier, price list CRUD, RFQ history |
| `/standards` | page | Search, specs table, equivalences table, add spec / add equivalence forms, delete |
| `/savings` | page | Monthly proposed vs approved bars, by category, per-BOM table |
| `/settings` | page | Workspace settings form, data location, AI fallback status |
| `/samples/*.csv` | static | `bom-template.csv`, `sample-bom.csv` |

Removed: `/login`, `/invite/*`, `/forbidden`, `/app/*`, `proxy.ts`, Supabase clients, role matrix, invites.

## 5. Server actions (`lib/actions/*`)

Each returns `{ ok: true, … } | { error: string }`, validates its input (typed form helpers that return user-facing messages), and logs an audit event where the change is BOM-scoped.

| File | Actions |
| --- | --- |
| `boms.ts` | `uploadBom(formData)`, `loadSampleBom()`, `updateBomMeta(id, formData)`, `rematchBom(id)`, `reimportBom(id)`, `deleteBom(id)` |
| `items.ts` | `updateItem(itemId, formData)` (then re-matches the line) |
| `alternatives.ts` | `acceptAlternative(id)`, `rejectAlternative(id)`, `resetAlternative(id)`, `setCustomerStatus(id, formData)` |
| `rfqs.ts` | `createRfq(alternativeId, supplierId?)`, `markRfqSent(id)`, `recordQuote(id, formData)`, `closeRfq(id)` |
| `suppliers.ts` | `saveSupplier(formData)`, `deleteSupplier(id)`, `savePrice(formData)`, `deletePrice(id)` |
| `standards.ts` | `addSpec(formData)`, `addEquivalence(formData)`, `deleteSpec(id)`, `deleteEquivalence(id)` |
| `settings.ts` | `saveSettings(formData)` |

## 6. UI conventions
- Tailwind 4 with brand tokens (`app/globals.css`). Primitives live in `components/seion/ui.tsx` (Button, Card, PageHeader, Field, Input, Select, Textarea, EmptyState, Stat).
- Badges: BOM status, match, equivalence, recommendation, decision, customer status, RFQ status, supplier certifications.
- Money: `₹` with `en-IN` grouping. Per-unit values to 2 decimals; per-vehicle and annual values rounded. Negative savings shown in red with "costs more".
- Shell: sidebar (desktop) or scrollable top bar (mobile). The header shows the company name from Settings. No sign-out.

## 7. Testing
- **Unit:** normalize/numbers, canonicalize, matching, rules engine, savings, RFQ template, CSV export.
- **Repository and pipeline** against `openDatabase(":memory:")`:
  - import CSV → lines matched → alternatives created, including spec-only ones
  - accept → unique accepted
  - re-match keeps decisions
  - quote updates the price list and alternative cost
  - delete cascades
- **E2E smoke:** Playwright against `next start`: load sample → open BOM → accept → customer approve → RFQ create / sent / quote → proposal print renders → dashboard numbers change.

## 8. Deployment
- Local: `pnpm install && pnpm dev` (or `pnpm build && pnpm start`). Data goes to `./data/seion.db` (gitignored).
- Docker: `node:22-slim` image, `pnpm build`, `VOLUME /app/data`, `EXPOSE 3000`.
- Backup: copy `data/seion.db` (or use `sqlite3 .backup`).
- **Serverless (Vercel, Lambda, Netlify):** the project directory is read-only. With no `DATABASE_PATH`, the DB goes to `os.tmpdir()/seion/seion.db`, it is marked *ephemeral*, a banner is shown, and demo data is seeded into each fresh database (`SEION_DEMO_DATA` overrides). If the default `./data` turns out not to be writable on any host, the app falls back to the same temporary location instead of crashing. Data is per-instance and resets on restart, so this is a demo mode; production needs a persistent disk.
- **Bundling:** sample CSVs are TypeScript modules served by `app/samples/[file]`, not `public/` files read at runtime. The pdf.js worker is preloaded on `globalThis.pdfjsWorker`, so PDF parsing doesn't depend on files beside the bundle. Server-action uploads allow 5 MB (`experimental.serverActions.bodySizeLimit`) and the app caps files at 4 MB.
- No auth: deploy on a trusted network, or put an authenticating reverse proxy in front.

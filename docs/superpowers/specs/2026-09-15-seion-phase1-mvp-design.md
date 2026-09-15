# SEION AutoPart AI — Phase 1 MVP Design

**Date:** 2026-09-15  
**Status:** Draft for review  
**Product:** SEION AutoPart AI  
**Scope:** First shippable plant MVP (Phase 1 core). Not the 12-month enterprise platform.

This document is the source of truth for implementation. Later phases (CAD/STEP, supplier portal, WhatsApp RFQ, PPAP, SAP/Tally, SAML, SOC 2) are explicitly out of scope.

---

## 1. Problem and success

Tier-2 automotive plants receive OEM BOMs that name foreign-standard parts (DIN, ISO, JIS, ASTM/SAE). Engineers spend days mapping those lines to BIS/ARAI-ready Indian Standards and local suppliers.

**This MVP is successful when an invited plant user can:**

1. Sign in with email and password after an admin invite.
2. Upload an Excel, CSV, or text-based PDF BOM.
3. See extracted line items persisted against their organization.
4. See Indian Standard alternatives for mapped specs, with seeded local suppliers and savings where prices exist.
5. Open an on-demand metallurgical validation report for a chosen alternative.
6. Copy a drafted RFQ email for a chosen alternative.
7. See dashboard and savings numbers that come from real accepted alternatives, not mocks.

A second tenant created in tests must never see the first tenant’s BOMs.

---

## 2. Locked decisions

| Topic | Decision |
|---|---|
| Product slice | Phase 1 core only |
| Tenancy | Multi-tenant schema; **one seeded org**; invite-only users |
| Auth | Email invite + password (Supabase Auth) |
| Roles | `plant_admin`, `procurement_engineer`, `quality_manager` |
| Ingestion | `.xlsx`, `.csv`, **text PDF tables**. No scanned-drawing OCR, no STEP/CAD |
| Matching | Seeded `standard_equivalents` is source of truth. Groq does not invent IS codes |
| Unmapped parts | Status `NEEDS_REVIEW`; keep original spec |
| AI provider | **Groq** (`https://api.groq.com/openai/v1`), env `GROQ_API_KEY` server-only |
| Extract + RFQ draft | `openai/gpt-oss-20b` with strict JSON schema (extract) / plain text (RFQ) |
| Metallurgy | `openai/gpt-oss-120b` with strict JSON schema, on demand only |
| Hosting | Next.js 16 on Vercel; Supabase Auth + Postgres RLS + Storage |
| Rewrite style | Greenfield app structure; keep SEION visual language (navy/red, Inter, dashboard chrome) |
| Jobs | No Redis/BullMQ. Process in-request with chunking; persist `EXTRACTING` / `ANALYZED` / `FAILED` |
| Validation timing | Not automatic on every line. User triggers per alternative |
| BOM versions | One BOM header + lines. No revision table |
| RFQ | Draft + copy. No email/WhatsApp dispatch, no supplier portal |

---

## 3. Architecture

Greenfield Next.js 16 App Router application. The current prototype (`app/page.tsx` client-side tab switcher, `MOCK_BOM_PARTS`, `NEXT_PUBLIC_GEMINI_API_KEY`) is replaced, not incrementally patched.

```
Browser  →  Next.js (Vercel)
              ├─ Supabase Auth (cookie session)
              ├─ Postgres + RLS (tenant_id)
              ├─ Storage (private BOM files, signed URLs)
              └─ Groq API (server-only)
                    ├─ gpt-oss-20b  extract / RFQ
                    └─ gpt-oss-120b metallurgy
              └─ Seeded IS equivalent table (deterministic match)
```

**Principles**

1. Engineering facts (thread, grade, IS code, tensile numbers in the catalog) come from the database, not the model.
2. Secrets never ship to the browser. `GROQ_API_KEY` and the Supabase service role exist only on the server.
3. Every business row is tenant-scoped. RLS is the last line of defense, not the only one (queries still filter `tenant_id`).
4. Groq free-tier limits (~30 RPM, 1k RPD, 8k TPM, 200k TPD on these models) are a product constraint: chunk extraction, on-demand validation, retry on 429.

**Not in this architecture:** Kong, Neo4j, Redis, Vertex AI, Gemini, xAI Grok, WhatsApp, SAP OData, TISAX, BYOK, Kubernetes.

---

## 4. Domain model

### 4.1 Tables

**`tenants`**  
`id uuid pk`, `name`, `legal_entity_name`, `gst_number`, `tier_level` (`TIER_1` \| `TIER_2` \| `TIER_3` \| `JOB_SHOP`), `industrial_cluster`, `is_active`, timestamps.

MVP seeds exactly one tenant (example: “SEION Demo Plant”, Chennai, `TIER_2`).

**`profiles`**  
`id uuid pk` = `auth.users.id`, `tenant_id fk`, `full_name`, `role` (`plant_admin` \| `procurement_engineer` \| `quality_manager`), `is_active`, timestamps.

**`invites`**  
`id uuid pk`, `tenant_id fk`, `email`, `role`, `token` (unique), `invited_by` → profiles, `expires_at` (72 hours), `accepted_at` nullable, timestamps.

**`boms`**  
`id uuid pk`, `tenant_id fk`, `bom_code`, `title`, `target_vehicle_platform`, `currency` default `INR`, `status` (`DRAFT` \| `EXTRACTING` \| `ANALYZED` \| `FAILED` \| `APPROVED`), `source_filename`, `source_storage_path`, `source_mime`, `error_message` nullable, `total_original_cost numeric`, `total_optimized_cost numeric`, `total_savings_pct numeric`, `created_by` → profiles, timestamps.

**`bom_items`**  
`id uuid pk`, `bom_id fk`, `tenant_id fk`, `line_number int`, `part_number`, `part_name`, `category`, `original_spec`, `canonical_spec_key`, `material_grade`, `quantity_per_vehicle int`, `current_unit_cost numeric` nullable, `current_supplier_name`, `match_status` (`MATCHED` \| `NEEDS_REVIEW` \| `CUSTOM`), `extraction_confidence numeric`, timestamps.

**`standard_specs`** (global, not tenant-scoped)  
`id uuid pk`, `body` (`DIN` \| `ISO` \| `IS` \| `JIS` \| `ASTM` \| `SAE` \| `AIS`), `code` (e.g. `DIN 912`, `IS 1367 Part 3`), `part_family` (e.g. `hex_socket_cap_screw`), `canonical_key`, mechanical fields as jsonb (`property_class`, `tensile_mpa_min`, `yield_mpa_min`, `hardness`, `thread_fit`), `notes`.

**`standard_equivalents`** (global)  
`id uuid pk`, `from_spec_id fk`, `to_spec_id fk`, `equivalence` (`EQUIVALENT` \| `NEAR` \| `NOT_EQUIVALENT`), `notes`, unique (`from_spec_id`, `to_spec_id`).

**`suppliers`** (global seed for MVP; later can be tenant-private)  
`id uuid pk`, `legal_name`, `brand_name`, `industrial_hub`, `state`, `iatf_16949_certified bool`, `iso_9001_certified bool`, `rating numeric`, `average_lead_time_days int`.

**`part_alternatives`**  
`id uuid pk`, `bom_item_id fk`, `tenant_id fk`, `supplier_id fk` nullable, `standard_spec_id fk` nullable, `rank_order int`, `alternative_spec`, `indian_standard_code`, `alternative_unit_cost numeric` nullable, `savings_percentage numeric` nullable, `lead_time_days int`, `is_ais_compliant bool`, `confidence_score numeric`, `status` (`SUGGESTED` \| `ACCEPTED` \| `REJECTED`), timestamps.

**`technical_validations`**  
`id uuid pk`, `alternative_id fk`, `tenant_id fk`, `ai_engine` (store model id, e.g. `openai/gpt-oss-120b`), `material_composition_result` (`EQUIVALENT` \| `SUPERIOR` \| `INFERIOR` \| `INCOMPATIBLE`), `mechanical_properties_result` (same enum), `dimensional_fit_result` (`INTERCHANGEABLE` \| `REQUIRES_MODIFICATION` \| `INCOMPATIBLE`), `recommendation` (`SAFE_TO_SWITCH` \| `REQUIRES_TESTING` \| `NOT_RECOMMENDED`), `validation_summary_markdown`, `report_json jsonb`, `validated_by` → profiles, `validated_at`.

**`audit_events`**  
`id uuid pk`, `tenant_id fk`, `actor_id` → profiles nullable, `action` (e.g. `bom.uploaded`, `alternative.accepted`, `invite.sent`, `validation.ran`, `rfq.drafted`), `entity_type`, `entity_id`, `metadata jsonb`, `created_at`. Append-only.

### 4.2 RLS

- Enable RLS on all tenant-owned tables.
- Policy: `tenant_id = (select tenant_id from profiles where id = auth.uid())`.
- `standard_specs`, `standard_equivalents`, `suppliers`: `SELECT` for authenticated users; writes via service role / migrations only.
- Server jobs that insert BOM lines use the user’s session when possible; if a service-role path is required, it must set `tenant_id` from the authenticated user **before** insert and never accept `tenant_id` from the client body.

### 4.3 Seed data (required for a working demo)

From `docs/standards-and-domain-model.md`, seed at least:

**Fasteners**

| From | To |
|---|---|
| DIN 912 / ISO 4762 | IS 1367 Part 3 / IS 2269 |
| DIN 931/933 / ISO 4014/4017 | IS 1364 Part 1 & 2 |
| DIN 934 / ISO 4032 | IS 1364 Part 3 |
| DIN 125 / ISO 7089 | IS 2016 |
| DIN 127 / ISO 6157 | IS 3063 |
| DIN 7991 / ISO 10642 | IS 6761 |
| DIN 975/976 | IS 1862 |

**Steels (subset)**

| From | To |
|---|---|
| EN 10130 FeP04 | IS 513 CR4/CR5 |
| 16MnCr5 | IS 5517 16MnCr5 |
| 42CrMo4 | IS 5517 40Cr4Mo2 |
| S235JR | IS 2062 E250 |
| 55Cr3 | IS 4454 Part 1 |

**Coatings (flags, not full catalog):** zinc electroplate vs zinc flake (IS 16647 / ISO 10683) vs phosphate.

**Suppliers (examples, clearly labeled as seed):** ChennaiFasteners Ltd (Chennai), MumbaiSteel, TamilNadu Stamping, ChennaiRubber, IndiaFasteners, PuneFab — with hub, IATF flag, lead time, indicative unit prices for the fastener SKUs used in the demo BOM.

**Users:** one Plant Admin invite target configured via env (`SEED_ADMIN_EMAIL`) or a documented seed script; no hardcoded production passwords in git.

---

## 5. Application structure

Replace the single-page prototype with App Router routes. Delete or stop using: `app/page.tsx` view switcher, client `lib/gemini.ts`, `MOCK_BOM_PARTS`, decorative Settings/Support placeholders.

```
app/
  page.tsx                          # public landing
  login/page.tsx
  invite/[token]/page.tsx
  app/
    layout.tsx                      # authed shell (sidebar + top bar)
    page.tsx                        # dashboard
    boms/page.tsx
    boms/[id]/page.tsx
    savings/page.tsx
    settings/users/page.tsx
    settings/standards/page.tsx
  api/                              # only where Server Actions cannot stream/upload
lib/
  supabase/                         # browser, server, service clients
  auth/                             # requireUser, requireRole
  ingestion/                        # excel, csv, pdf-text, chunker
  matching/                         # canonicalize + lookup
  groq/                             # extract, validate, rfq
  boms/                             # queries + totals
  audit/
supabase/migrations/
```

Keep existing shadcn/ui primitives and brand tokens. Rebuild feature components (`landing`, `dashboard`, `bom-detail`, `savings`) rather than extending the mock views.

### 5.1 Routes and permissions

| Route | Auth | Roles | Purpose |
|---|---|---|---|
| `/` | Public | — | Marketing landing, Login CTA |
| `/login` | Public | — | Email + password |
| `/invite/[token]` | Public | — | Set password, create profile on the seeded tenant |
| `/app` | Session | All | KPIs, upload, recent BOMs |
| `/app/boms` | Session | All | List |
| `/app/boms/[id]` | Session | All | Lines, alternatives, validate, RFQ copy, accept/reject |
| `/app/savings` | Session | All | Charts from accepted alternatives |
| `/app/settings/users` | Session | `plant_admin` only | Invite by email + role |
| `/app/settings/standards` | Session | All | Read-only equivalent library |

Locked role matrix:

| Action | Admin | Procurement | Quality |
|---|---|---|---|
| Invite users | yes | no | no |
| Upload BOM | yes | yes | no |
| Accept / reject alternative | yes | yes | no |
| Run validation | yes | yes | yes |
| Draft RFQ | yes | yes | no |
| View BOMs / savings / standards | yes | yes | yes |

### 5.2 Screens — behavior

**Landing.** Same promise as the demo: upload BOM, IS alternatives, savings. Login, not a fake “enter app” button.

**Dashboard.** Real counts: BOMs this month, sum of accepted savings, compliance rate = accepted AIS-compliant alternatives / accepted alternatives (0% if none). Dropzone uploads a real file. Recent activity is the tenant’s last BOMs.

**BOM detail.** Header with code, status, original vs optimized totals. Table of items. Select a row → alternatives ranked. Accept one alternative per item (accepting a new one rejects the previous). “Technical validation” opens a panel fed by `technical_validations` or triggers Groq. “Draft RFQ” shows copyable email. Unmapped rows show Needs review and no fake vendor.

**Savings.** Time series and category breakdown from `part_alternatives` where `status = ACCEPTED` and costs are non-null. Empty state if nothing accepted yet.

**Users.** Admin enters email + role. The app always displays the invite URL (`/invite/[token]`) so the admin can copy it. If Supabase Auth email is configured, it also emails the link. Dev without SMTP still works via copy-link.

---

## 6. Ingestion and matching

### 6.1 Upload

- Max 10 MB.
- Allowed: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv`, `application/pdf`, plus `.xlsx` / `.csv` / `.pdf` by extension if MIME is generic.
- Reject `.step`, `.stp`, images, `.xls` (old binary Excel) in MVP with a clear error: “Export as .xlsx or CSV”.
- Store in bucket `bom-uploads` at `{tenant_id}/{bom_id}/{filename}`. Bucket is private.
- Create BOM `EXTRACTING`, then parse.

### 6.2 Parse (deterministic)

- Excel: ExcelJS. First worksheet. Detect header row within first 20 rows.
- CSV: first row headers, UTF-8, comma or tab.
- PDF: `pdf-parse` (or equivalent) text extraction. If no extractable text, fail with “This PDF has no text layer. Export tables to Excel.” Do not call Groq Vision.

Column mapping: Groq `gpt-oss-20b` maps header names to `{ part_number, part_name, original_spec, quantity, unit_cost, supplier, material, category }` with strict JSON. Then rows are parsed in **chunks of at most 20 lines** per Groq call so prompts stay under the 8k TPM budget.

If Groq mapping fails, fall back to a deterministic header synonym list:

`part`, `part no`, `p/n`, `oem p/n` → part_number  
`description`, `item`, `nomenclature` → part_name  
`spec`, `standard`, `material spec`, `matl` → original_spec  
`qty`, `qty req`, `quantity` → quantity  
`rate`, `unit cost`, `price` → unit_cost  

A row with no `part_name` and no `original_spec` is skipped and counted in `error_message` summary.

### 6.3 Canonical spec key

Normalize before lookup:

- Uppercase, collapse whitespace, `×` and `x` → `X`, strip punctuation except digits and X.
- Example: `DIN 912 M6x20 8.8` → `DIN912|M6X20|8.8`
- Tokenize body (`DIN`/`ISO`/`IS`/`JIS`) + designation + size + property class when present.

Lookup order:

1. Exact `canonical_key` on `standard_specs`.
2. `standard_equivalents` where from-spec matches, `equivalence` in (`EQUIVALENT`, `NEAR`), prefer Indian `IS` to-spec.
3. Else `NEEDS_REVIEW`.

Attach up to 3 `part_alternatives`: ranked seed suppliers that list that IS family, with seed unit cost if present. `savings_percentage` only when both original and alternative unit costs are non-null.

### 6.4 Totals

```
total_original_cost = sum(qty * current_unit_cost) for items with cost
total_optimized_cost = for each item:
  if accepted alternative with cost: qty * alt cost
  else if item cost: qty * item cost
  else: exclude from both sides of the percentage
total_savings_pct = 100 * (original - optimized) / original when original > 0
```

Recompute on accept/reject.

---

## 7. Groq integration

**Client:** official `groq-sdk` (OpenAI-compatible). Base URL `https://api.groq.com/openai/v1`.  
**Key:** `GROQ_API_KEY` in Vercel/server env. Never `NEXT_PUBLIC_`.

### 7.1 Extract (`openai/gpt-oss-20b`)

- `response_format.json_schema` with `strict: true`.
- Schema: `{ "items": [ { "line_number", "part_number", "part_name", "original_spec", "quantity", "unit_cost", "supplier", "material", "category" } ] }` — all fields required; use empty string or 0 for missing, never omit. Application treats empty spec/name as skip.
- Temperature 0.
- Chunk 20 rows; concatenate.

### 7.2 Validate (`openai/gpt-oss-120b`)

Triggered by user on one alternative.

Input: original spec + catalog fields for both specs + application note (default “automotive fastener / structural, underbody unless specified”).

Output strict JSON:

```
{
  "material_composition_result": "EQUIVALENT" | "SUPERIOR" | "INFERIOR" | "INCOMPATIBLE",
  "mechanical_properties_result": same,
  "dimensional_fit_result": "INTERCHANGEABLE" | "REQUIRES_MODIFICATION" | "INCOMPATIBLE",
  "recommendation": "SAFE_TO_SWITCH" | "REQUIRES_TESTING" | "NOT_RECOMMENDED",
  "summary_markdown": string
}
```

The model may **explain** catalog numbers; it may not change `indian_standard_code` already stored. Persist one row in `technical_validations`. Re-run replaces or inserts a new row (keep latest as current; history allowed).

### 7.3 RFQ draft (`openai/gpt-oss-20b`)

Plain text email: spec, qty (use item qty), target price if any, delivery = tenant `industrial_cluster`, ask for BIS/MTR, sign with the logged-in user’s name and role. Copy to clipboard. Do not send.

### 7.4 Failures

- HTTP 429: honor `retry-after`, max 3 retries, then surface “AI rate limit, wait a minute and retry.”
- 401/403: log server-side; user sees “AI is not configured.”
- Timeout (60 s per chunk): fail that BOM to `FAILED` if extraction; fail the modal if validation/RFQ.
- Never return Groq raw error bodies to the client.

---

## 8. Error and empty states

| Situation | UX |
|---|---|
| Empty BOM list | CTA to upload |
| Empty savings | “Accept alternatives on a BOM to see savings” |
| FAILED BOM | Banner with `error_message` + Retry (re-parse stored file) |
| Unmapped item | Amber `Needs review`, no alternatives list |
| Invite expired / used | “Ask your Plant Admin to send a new invite” |
| Non-admin hits `/app/settings/users` | 403 page |
| Quality hits upload | Control hidden; API 403 |
| Second tenant | Impossible in production seed; tests create tenant B and assert 0 rows |

---

## 9. Security

- Server Actions / Route Handlers for upload, invite, accept, validate, RFQ.
- Session via `@supabase/ssr` cookies.
- Storage: only signed URLs, short TTL (60 s) when downloading source files.
- Audit every upload, accept, reject, invite, validation, RFQ draft.
- No Gemini, no public AI keys.
- CORS default (same origin). No public `/api` without session except `/invite` consume.

---

## 10. Testing

**Unit**

- `canonicalizeSpec("DIN 912 M6x20 8.8")` → `DIN912|M6X20|8.8`
- Equivalent lookup for DIN 912 → IS 1367 Part 3
- Unknown spec → `NEEDS_REVIEW`
- Totals with mixed null costs
- Header synonym fallback without Groq

**Integration (fixtures in `tests/fixtures/`)**

- `fasteners.xlsx` — 5 lines matching seed (the demo BOM)
- `messy.csv` — odd headers
- `table.pdf` — simple text table
- `scanned-empty.pdf` — no text → FAILED with the text-layer message

**Auth**

- Invite → set password → session
- RLS: tenant A cannot `select` tenant B BOMs
- Quality cannot upload; Admin can invite

**Groq**

- CI mocks Groq HTTP.
- Optional live smoke behind `GROQ_API_KEY` in local env only.

---

## 11. Implementation notes (non-goals vs later)

**In MVP**

- Greenfield routes and domain libs
- Supabase migrations + seed
- Real upload/parse/match
- Groq extract/validate/RFQ
- Invite-only auth
- Savings from accepted alts
- Read-only standards library UI

**Not in MVP**

- Scanned PDF vision, STEP/IGES, Three.js viewer
- Redis/Inngest
- BOM revisions
- RFQ dispatch, WhatsApp, supplier magic-link portal
- PPAP/PSW generation
- SAP / Tally / Zoho
- SAML / Entra ID
- Billing, self-serve signup, multi-org switcher
- Replacing lucide with a new icon system as a separate project (use `lucide-react` directly)

**Prototype files to remove once replaced**

- `lib/gemini.ts`
- Client-only mock arrays in `components/results-view.tsx` / `savings-view.tsx`
- `NEXT_PUBLIC_GEMINI_API_KEY` usage

---

## 12. Open configuration (not product questions)

These are install-time values, not design debates:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only, seed/migrate)
- `GROQ_API_KEY`
- `SEED_ADMIN_EMAIL` (optional)

Supabase MCP in this workspace is currently unauthorized; project linking happens at implementation time (`supabase login` / Vercel env).

---

## 13. Traceability to existing docs

| Existing doc | What this MVP takes | What it defers |
|---|---|---|
| `docs/product-strategy.md` | ICP, 15–40% savings story, Starter-tier workflow | Pricing pages, Tier-1 ERP SKU |
| `docs/architecture.md` | Deterministic graph over generative; server-side AI; RLS | Microservices, Neo4j, Redis, CAD parser |
| `docs/standards-and-domain-model.md` | Fastener/steel matrices, core ERD | Full 500+ IS corpus, PPAP package |
| `docs/api-specification.md` | Conceptual resources (BOMs, validations) | Public REST + HMAC webhooks |
| `docs/enterprise-roadmap.md` | Phase 1 P0 items | Phases 2–4 |

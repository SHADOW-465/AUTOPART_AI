# Implementation Plan — SEION AutoPart AI v1.0

Builds [spec.md](./spec.md). Each phase ends green: `pnpm test`, `pnpm typecheck` and `pnpm build`.

Verification run: 102 unit/integration tests; a 19-step Playwright walkthrough against `next start` covering first run, settings, sample import, accept + customer approval, coating warning, RFQ draft → sent → quote → re-price, line edit, plant equivalence + re-match, annual volume, CSV, proposal pack, upload, bad-file rejection, supplier + price, dashboard, savings, mobile layout (no horizontal overflow) and delete. Every page returns 200 with no console errors.

| Phase | Work | Exit check | Status |
| --- | --- | --- | --- |
| **0. Remove auth and cloud** | Delete `/login`, `/invite`, `/forbidden`, `proxy.ts`, `lib/supabase`, `lib/auth`, invite / auth actions, the Supabase folder, AI validate / RFQ modules and their tests. Drop the `@supabase/*` deps. Archive superseded docs. | Remaining tests pass | Done |
| **1. Data layer** | `lib/db/{client,schema,seed,types}.ts`; repositories `lib/repo/{settings,standards,suppliers,boms,alternatives,rfqs,audit}.ts`; transaction helper | Repo tests on `:memory:`: migrate, seed counts, CRUD, cascades, one-accepted index | Done |
| **2. Domain engines** | `ingestion/normalize.ts` (number parsing, spec-in-description) + extended header synonyms; `validation/rules.ts`; `boms/savings.ts`; `rfq/template.ts`; update `boms/export.ts` | Unit tests for each | Done |
| **3. Pipelines** | `boms/import.ts` (parse → normalize → optional AI → insert → match); `boms/rematch.ts` (decision-preserving) | Pipeline tests: sample CSV end to end, re-match keeps accepted, quote → alternative cost | Done |
| **4. Actions** | `lib/actions/*` per spec §5, with validated form input, audit events and revalidation | Typecheck | Done |
| **5. UI** | Shell and UI primitives; routes per spec §4; print pack; sample and template CSVs | Build; manual pass at phone and desktop widths | Done |
| **6. Verify and ship** | Playwright E2E walkthrough with screenshots; README, Dockerfile, `.env.example`; commit; push; update PR | All green, screenshots reviewed | Done |

## Risk register

| Risk | Mitigation |
| --- | --- |
| `node:sqlite` is flagged experimental | Stable API since Node 22.13. Pin `engines.node >= 22.13`. One-line warning only. |
| Static prerender touching the DB at build | `dynamic = "force-dynamic"` on every DB page; `getDb()` is lazy |
| Re-match destroying user work | ACCEPTED alternatives are never deleted by re-match. Re-importing from the file is a separate, confirmed action. |
| Seed prices mistaken for real quotes | `origin='SEED'` shown as an "Indicative" badge; RFQ quotes overwrite them with `source='RFQ'` |
| Unauthenticated exposure | README deployment section; no secrets stored in the app |

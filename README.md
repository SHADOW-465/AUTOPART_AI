# SEION AutoPart AI

Maps foreign-spec BOM lines (DIN / ISO / SAE) to BIS / Indian Standard equivalents for automotive Tier-2 suppliers. Engineers can review each swap, run an AI metallurgy check, draft an RFQ, and export a localization proposal (CSV) for customer approval.

See [docs/market-research.md](docs/market-research.md) for the market validation behind this scope.

## Features

- Invite-only email / password auth with three roles (plant admin, procurement engineer, quality manager) and per-plant data isolation (Postgres RLS)
- BOM upload (xlsx, csv, text-layer PDF) → line extraction → matching against the seeded `standard_equivalents` table
- Per-line alternatives: accept / reject, AI metallurgy validation, RFQ email draft
- CSV export of each BOM's proposed alternatives (`/app/boms/:id/export`)
- Savings dashboard from accepted alternatives; read-only standards library

## Setup

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `GROQ_API_KEY` | Groq API key for extraction, validation, and RFQ |
| `SEED_ADMIN_EMAIL` | Optional seed plant-admin email |

Groq models used: `openai/gpt-oss-20b` (extraction / RFQ) and `openai/gpt-oss-120b` (validation). Get a key at [console.groq.com](https://console.groq.com).

## Database

Apply schema then seed (Supabase CLI or SQL editor):

```bash
# migrations
supabase db push
# or apply files in order:
#   supabase/migrations/20260915120000_init.sql
#   supabase/migrations/20260915130000_one_accepted_alternative.sql
#   supabase/migrations/20260915140000_role_write_gates.sql

# seed catalog / demo plant
#   supabase/seed.sql
```

## Scripts

```bash
pnpm install
pnpm test      # vitest
pnpm typecheck
pnpm dev       # Next.js 16
pnpm build
```

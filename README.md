# SEION AutoPart AI

AI-powered BOM alternative suggestion for automotive suppliers. Finds cheaper, Indian-standard-compliant part alternatives.

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
pnpm dev       # Next.js 16
pnpm build
```

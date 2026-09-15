-- SEION Phase 1 MVP: multi-tenant BOM schema, RLS, and private BOM storage.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

create or replace function public.prevent_profile_privilege_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.tenant_id is distinct from old.tenant_id or new.role is distinct from old.role then
      if auth.role() <> 'service_role' then
        raise exception 'Cannot change tenant_id or role';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name varchar(255) not null,
  legal_entity_name varchar(255),
  gst_number varchar(15) unique,
  tier_level varchar(20) not null check (tier_level in ('TIER_1', 'TIER_2', 'TIER_3', 'JOB_SHOP')),
  industrial_cluster varchar(100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  full_name varchar(255),
  role varchar(32) not null check (role in ('plant_admin', 'procurement_engineer', 'quality_manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger profiles_freeze_tenant_role
before update on public.profiles
for each row execute procedure public.prevent_profile_privilege_change();

-- Security-definer lookup so profiles tenant-wide SELECT does not recurse.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_tenant_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email varchar(255) not null,
  role varchar(32) not null check (role in ('plant_admin', 'procurement_engineer', 'quality_manager')),
  token varchar(128) not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '72 hours'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invites_tenant_id_idx on public.invites (tenant_id);
create index invites_email_idx on public.invites (lower(email));

create trigger invites_set_updated_at
before update on public.invites
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- BOMs
-- ---------------------------------------------------------------------------

create table public.boms (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  bom_code varchar(100) not null,
  title varchar(255) not null,
  target_vehicle_platform varchar(100),
  currency varchar(3) not null default 'INR',
  status varchar(32) not null default 'DRAFT'
    check (status in ('DRAFT', 'EXTRACTING', 'ANALYZED', 'FAILED', 'APPROVED')),
  source_filename varchar(255),
  source_storage_path text,
  source_mime varchar(127),
  error_message text,
  total_original_cost numeric(14, 4),
  total_optimized_cost numeric(14, 4),
  total_savings_pct numeric(7, 2),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, bom_code)
);

create index boms_tenant_id_idx on public.boms (tenant_id);

create trigger boms_set_updated_at
before update on public.boms
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- BOM line items
-- ---------------------------------------------------------------------------

create table public.bom_items (
  id uuid primary key default uuid_generate_v4(),
  bom_id uuid not null references public.boms (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  line_number integer not null,
  part_number varchar(100),
  part_name varchar(255),
  category varchar(100),
  original_spec varchar(255),
  canonical_spec_key varchar(255),
  material_grade varchar(100),
  quantity_per_vehicle integer not null default 1,
  current_unit_cost numeric(12, 4),
  current_supplier_name varchar(255),
  match_status varchar(32) not null default 'NEEDS_REVIEW'
    check (match_status in ('MATCHED', 'NEEDS_REVIEW', 'CUSTOM')),
  extraction_confidence numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bom_id, line_number)
);

create index bom_items_tenant_id_idx on public.bom_items (tenant_id);
create index bom_items_bom_id_idx on public.bom_items (bom_id);

create trigger bom_items_set_updated_at
before update on public.bom_items
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Global standards catalog
-- ---------------------------------------------------------------------------

create table public.standard_specs (
  id uuid primary key default uuid_generate_v4(),
  body varchar(8) not null check (body in ('DIN', 'ISO', 'IS', 'JIS', 'ASTM', 'SAE', 'AIS', 'EN')),
  code varchar(128) not null,
  part_family varchar(64) not null,
  canonical_key varchar(128) not null unique,
  mechanical jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (body, code)
);

create trigger standard_specs_set_updated_at
before update on public.standard_specs
for each row execute procedure public.set_updated_at();

create table public.standard_equivalents (
  id uuid primary key default uuid_generate_v4(),
  from_spec_id uuid not null references public.standard_specs (id) on delete cascade,
  to_spec_id uuid not null references public.standard_specs (id) on delete cascade,
  equivalence varchar(32) not null check (equivalence in ('EQUIVALENT', 'NEAR', 'NOT_EQUIVALENT')),
  notes text,
  created_at timestamptz not null default now(),
  unique (from_spec_id, to_spec_id),
  check (from_spec_id <> to_spec_id)
);

create index standard_equivalents_from_spec_id_idx on public.standard_equivalents (from_spec_id);
create index standard_equivalents_to_spec_id_idx on public.standard_equivalents (to_spec_id);

-- ---------------------------------------------------------------------------
-- Global suppliers + catalog prices
-- ---------------------------------------------------------------------------

create table public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  legal_name varchar(255) not null,
  brand_name varchar(255),
  industrial_hub varchar(100) not null,
  state varchar(100) not null,
  iatf_16949_certified boolean not null default false,
  iso_9001_certified boolean not null default true,
  rating numeric(3, 2) not null default 4.50,
  average_lead_time_days integer not null default 14,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute procedure public.set_updated_at();

create table public.supplier_catalog_prices (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  standard_spec_id uuid not null references public.standard_specs (id) on delete cascade,
  unit_cost numeric(12, 4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, standard_spec_id)
);

create index supplier_catalog_prices_spec_idx on public.supplier_catalog_prices (standard_spec_id);

create trigger supplier_catalog_prices_set_updated_at
before update on public.supplier_catalog_prices
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Part alternatives
-- ---------------------------------------------------------------------------

create table public.part_alternatives (
  id uuid primary key default uuid_generate_v4(),
  bom_item_id uuid not null references public.bom_items (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  standard_spec_id uuid references public.standard_specs (id) on delete set null,
  rank_order integer not null default 1,
  alternative_spec varchar(255) not null,
  indian_standard_code varchar(100) not null,
  alternative_unit_cost numeric(12, 4),
  savings_percentage numeric(7, 2),
  lead_time_days integer,
  is_ais_compliant boolean not null default true,
  confidence_score numeric(5, 2),
  status varchar(32) not null default 'SUGGESTED'
    check (status in ('SUGGESTED', 'ACCEPTED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index part_alternatives_tenant_id_idx on public.part_alternatives (tenant_id);
create index part_alternatives_bom_item_id_idx on public.part_alternatives (bom_item_id);

create trigger part_alternatives_set_updated_at
before update on public.part_alternatives
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Technical validations
-- ---------------------------------------------------------------------------

create table public.technical_validations (
  id uuid primary key default uuid_generate_v4(),
  alternative_id uuid not null references public.part_alternatives (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ai_engine varchar(100) not null default 'openai/gpt-oss-120b',
  material_composition_result varchar(32) not null
    check (material_composition_result in ('EQUIVALENT', 'SUPERIOR', 'INFERIOR', 'INCOMPATIBLE')),
  mechanical_properties_result varchar(32) not null
    check (mechanical_properties_result in ('EQUIVALENT', 'SUPERIOR', 'INFERIOR', 'INCOMPATIBLE')),
  dimensional_fit_result varchar(32) not null
    check (dimensional_fit_result in ('INTERCHANGEABLE', 'REQUIRES_MODIFICATION', 'INCOMPATIBLE')),
  recommendation varchar(32) not null
    check (recommendation in ('SAFE_TO_SWITCH', 'REQUIRES_TESTING', 'NOT_RECOMMENDED')),
  validation_summary_markdown text not null,
  report_json jsonb not null default '{}'::jsonb,
  validated_by uuid references public.profiles (id) on delete set null,
  validated_at timestamptz not null default now()
);

create index technical_validations_tenant_id_idx on public.technical_validations (tenant_id);
create index technical_validations_alternative_id_idx on public.technical_validations (alternative_id);

-- ---------------------------------------------------------------------------
-- Audit events (append-only)
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action varchar(64) not null,
  entity_type varchar(64) not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_tenant_created_idx on public.audit_events (tenant_id, created_at desc);

create trigger audit_events_no_update
before update on public.audit_events
for each row execute procedure public.prevent_audit_mutation();

create trigger audit_events_no_delete
before delete on public.audit_events
for each row execute procedure public.prevent_audit_mutation();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Tenant predicate: tenant_id = (select tenant_id from public.profiles where id = auth.uid())
-- ---------------------------------------------------------------------------

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.boms enable row level security;
alter table public.bom_items enable row level security;
alter table public.standard_specs enable row level security;
alter table public.standard_equivalents enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_catalog_prices enable row level security;
alter table public.part_alternatives enable row level security;
alter table public.technical_validations enable row level security;
alter table public.audit_events enable row level security;

-- profiles: self-select first so the tenant subquery can resolve without recursion
create policy profiles_select_self
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_select_tenant
on public.profiles
for select
to authenticated
using (tenant_id = public.current_tenant_id());

-- No authenticated INSERT: profiles are created by service role on invite accept (Task 10).

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid() and tenant_id = public.current_tenant_id())
with check (id = auth.uid() and tenant_id = public.current_tenant_id());

create policy tenants_select_own
on public.tenants
for select
to authenticated
using (id = (select tenant_id from public.profiles where id = auth.uid()));

create policy invites_tenant_all
on public.invites
for all
to authenticated
using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()))
with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy boms_tenant_all
on public.boms
for all
to authenticated
using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()))
with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy bom_items_tenant_all
on public.bom_items
for all
to authenticated
using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()))
with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy part_alternatives_tenant_all
on public.part_alternatives
for all
to authenticated
using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()))
with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy technical_validations_tenant_all
on public.technical_validations
for all
to authenticated
using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()))
with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy audit_events_select_tenant
on public.audit_events
for select
to authenticated
using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy audit_events_insert_tenant
on public.audit_events
for insert
to authenticated
with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- Global catalog: authenticated read; writes via service role / migrations only
create policy standard_specs_select_authenticated
on public.standard_specs
for select
to authenticated
using (true);

create policy standard_equivalents_select_authenticated
on public.standard_equivalents
for select
to authenticated
using (true);

create policy suppliers_select_authenticated
on public.suppliers
for select
to authenticated
using (true);

create policy supplier_catalog_prices_select_authenticated
on public.supplier_catalog_prices
for select
to authenticated
using (true);

-- ---------------------------------------------------------------------------
-- Grants (Supabase roles)
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated, anon;

grant select on public.tenants to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.invites to authenticated;
grant select, insert, update, delete on public.boms to authenticated;
grant select, insert, update, delete on public.bom_items to authenticated;
grant select on public.standard_specs to authenticated;
grant select on public.standard_equivalents to authenticated;
grant select on public.suppliers to authenticated;
grant select on public.supplier_catalog_prices to authenticated;
grant select, insert, update, delete on public.part_alternatives to authenticated;
grant select, insert, update, delete on public.technical_validations to authenticated;
grant select, insert on public.audit_events to authenticated;

revoke update, delete on public.audit_events from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Storage: private BOM uploads at {tenant_id}/{bom_id}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('bom-uploads', 'bom-uploads', false, 10485760)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create policy bom_uploads_select_own_tenant
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bom-uploads'
  and split_part(name, '/', 1) = (select tenant_id::text from public.profiles where id = auth.uid())
);

create policy bom_uploads_insert_own_tenant
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bom-uploads'
  and split_part(name, '/', 1) = (select tenant_id::text from public.profiles where id = auth.uid())
);

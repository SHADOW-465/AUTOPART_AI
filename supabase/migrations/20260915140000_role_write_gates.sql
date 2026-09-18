-- Role write gates: plant_admin invites; plant_admin + procurement_engineer BOM insert.

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;

drop policy if exists invites_tenant_all on public.invites;

create policy invites_select_tenant
on public.invites
for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy invites_insert_plant_admin
on public.invites
for insert
to authenticated
with check (
  tenant_id = public.current_tenant_id()
  and public.current_role() = 'plant_admin'
);

create policy invites_update_tenant
on public.invites
for update
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists boms_tenant_all on public.boms;

create policy boms_select_tenant
on public.boms
for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy boms_insert_uploaders
on public.boms
for insert
to authenticated
with check (
  tenant_id = public.current_tenant_id()
  and public.current_role() in ('plant_admin', 'procurement_engineer')
);

create policy boms_update_tenant
on public.boms
for update
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy boms_delete_tenant
on public.boms
for delete
to authenticated
using (tenant_id = public.current_tenant_id());

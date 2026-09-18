-- At most one ACCEPTED alternative per BOM item; accept siblings in one statement.

create unique index part_alternatives_one_accepted
  on public.part_alternatives (bom_item_id)
  where status = 'ACCEPTED';

create or replace function public.accept_part_alternative(p_alternative_id uuid)
returns void
language sql
security invoker
as $$
  update public.part_alternatives as pa
  set status = case when pa.id = p_alternative_id then 'ACCEPTED' else 'REJECTED' end
  where pa.bom_item_id = (
    select bom_item_id from public.part_alternatives where id = p_alternative_id
  );
$$;

revoke all on function public.accept_part_alternative(uuid) from public;
grant execute on function public.accept_part_alternative(uuid) to authenticated;

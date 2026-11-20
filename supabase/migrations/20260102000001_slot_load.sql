-- ============================================================================
-- Per-slot order counts for a day, as a SECURITY DEFINER function so customers
-- can see which pickup slots are full without being able to read other people's
-- orders (RLS only exposes their own). Returns aggregate counts only — no PII.
-- The create-payment Edge Function remains the authority that enforces capacity.
-- ============================================================================
create or replace function public.slot_load(p_date date)
returns table (location_id uuid, pickup_slot timestamptz, orders int)
language sql stable security definer set search_path = public as $$
  select o.location_id, o.pickup_slot, count(*)::int as orders
  from public.orders o
  where o.status <> 'cancelled'
    and o.pickup_slot is not null
    and (o.pickup_slot at time zone 'Pacific/Auckland')::date = p_date
  group by o.location_id, o.pickup_slot;
$$;

grant execute on function public.slot_load(date) to anon, authenticated;

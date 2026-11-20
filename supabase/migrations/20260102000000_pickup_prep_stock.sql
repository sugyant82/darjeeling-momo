-- ============================================================================
-- Pickup location types (home kitchen / truck), live kitchen controls
-- (prep buffer + pause), per-item prep time, and per-item stock (SKU) tracking.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pickup location type. A day may now offer a home kitchen AND/OR a truck,
--    so the schedule is keyed by (date, pickup_type) instead of date alone.
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.pickup_type as enum ('home', 'truck');
exception when duplicate_object then null; end $$;

alter table public.locations_schedule
  add column if not exists pickup_type public.pickup_type not null default 'truck',
  -- Live "kitchen is busy" dial: extra minutes added to every order's prep estimate.
  add column if not exists prep_buffer_minutes int not null default 0
    check (prep_buffer_minutes between 0 and 240),
  -- Live pause switch (distinct from is_closed, which means not trading at all that day).
  add column if not exists accepting_orders boolean not null default true;

-- Swap the per-date unique constraint for per-(date, pickup_type).
alter table public.locations_schedule drop constraint if exists locations_schedule_date_key;
do $$ begin
  alter table public.locations_schedule
    add constraint locations_schedule_date_type_key unique (date, pickup_type);
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. Per-item prep time and ready-made stock (SKU).
--    prep_minutes: minimum minutes to prepare an order containing this item.
--    stock_qty:    NULL = untracked (always available); >=0 = ready-made count,
--                  decremented as orders are paid; 0 = sold out.
-- ----------------------------------------------------------------------------
alter table public.menu_items
  add column if not exists prep_minutes int not null default 15
    check (prep_minutes between 0 and 600),
  add column if not exists stock_qty int
    check (stock_qty is null or stock_qty >= 0);

-- ----------------------------------------------------------------------------
-- 3. Decrement stock for a paid order (atomic; never goes below 0).
--    Called from the mark-paid path (service role) so stock only drops once the
--    order is actually paid. Untracked items (stock_qty is null) are left alone.
-- ----------------------------------------------------------------------------
create or replace function public.decrement_stock_for_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.menu_items m
  set stock_qty = greatest(0, m.stock_qty - agg.qty)
  from (
    select menu_item_id, sum(quantity)::int as qty
    from public.order_items
    where order_id = p_order_id and menu_item_id is not null
    group by menu_item_id
  ) agg
  where m.id = agg.menu_item_id and m.stock_qty is not null;
end; $$;

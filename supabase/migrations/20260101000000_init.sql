-- ============================================================================
-- Darjeeling Momo — initial schema, helpers and Row Level Security.
-- Money is integer cents (NZD). Times are timestamptz (stored UTC).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('customer', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('received', 'preparing', 'ready', 'collected', 'cancelled');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  tags text[] not null default '{}',
  is_available boolean not null default true,
  image_url text,
  sort int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items (category_id);

create table public.item_options (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  name text not null,
  required boolean not null default false,
  min_select int not null default 0,
  max_select int not null default 1,
  sort int not null default 0
);
create index item_options_item_idx on public.item_options (menu_item_id);

create table public.option_choices (
  id uuid primary key default gen_random_uuid(),
  item_option_id uuid not null references public.item_options (id) on delete cascade,
  label text not null,
  price_delta_cents int not null default 0,
  is_default boolean not null default false,
  sort int not null default 0
);
create index option_choices_option_idx on public.option_choices (item_option_id);

create table public.locations_schedule (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  place text not null,
  address text not null,
  map_link text,
  open_time time not null,
  close_time time not null,
  slot_minutes int not null default 15 check (slot_minutes between 5 and 120),
  max_orders_per_slot int not null default 10 check (max_orders_per_slot >= 1),
  is_closed boolean not null default false
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  quantity int not null check (quantity > 0),
  selected_options jsonb not null default '[]',
  unit_price_cents int not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now()
);
create index cart_items_cart_idx on public.cart_items (cart_id);

create sequence if not exists public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.order_status not null default 'received',
  location_id uuid references public.locations_schedule (id),
  pickup_slot timestamptz,
  notes text,
  phone text,
  subtotal_cents int not null check (subtotal_cents >= 0),
  gst_cents int not null check (gst_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  stripe_payment_intent_id text,
  payment_provider text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_pickup_idx on public.orders (pickup_slot);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  selected_options jsonb not null default '[]',
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity > 0),
  line_total_cents int not null check (line_total_cents >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to read role without RLS recursion)
-- ----------------------------------------------------------------------------
create or replace function public.my_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('staff', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Order number: DM-001001, DM-001002, ...
create or replace function public.set_order_number()
returns trigger language plpgsql as $$
begin
  if new.number is null or new.number = '' then
    new.number := 'DM-' || to_char(nextval('public.order_number_seq'), 'FM000000');
  end if;
  return new;
end; $$;

create trigger orders_set_number before insert on public.orders
  for each row execute function public.set_order_number();

-- Auto-create a profile when an auth user is created (Google/dev/magic-link alike)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent customers from escalating their own role; only admins may change role.
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only restrict authenticated, non-admin callers. A null auth.uid() means the
  -- service role / SQL editor / seed, which is trusted to set roles.
  if new.role is distinct from old.role and auth.uid() is not null then
    if coalesce((select role from public.profiles where id = auth.uid()), 'customer') <> 'admin' then
      new.role := old.role;
    end if;
  end if;
  return new;
end; $$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_role_change();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_options enable row level security;
alter table public.option_choices enable row level security;
alter table public.locations_schedule enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.push_tokens enable row level security;

-- profiles: own row, or staff can read all
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Public catalog: anyone may read; only staff may write.
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all
  using (public.is_staff()) with check (public.is_staff());

create policy menu_items_read on public.menu_items for select using (true);
create policy menu_items_write on public.menu_items for all
  using (public.is_staff()) with check (public.is_staff());

create policy item_options_read on public.item_options for select using (true);
create policy item_options_write on public.item_options for all
  using (public.is_staff()) with check (public.is_staff());

create policy option_choices_read on public.option_choices for select using (true);
create policy option_choices_write on public.option_choices for all
  using (public.is_staff()) with check (public.is_staff());

create policy schedule_read on public.locations_schedule for select using (true);
create policy schedule_write on public.locations_schedule for all
  using (public.is_staff()) with check (public.is_staff());

-- Carts: owner only
create policy carts_owner on public.carts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy cart_items_owner on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- Orders: customers read their own; staff read/update all.
-- Inserts happen only via the create-payment Edge Function (service role).
create policy orders_select on public.orders
  for select using (user_id = auth.uid() or public.is_staff());
create policy orders_staff_update on public.orders
  for update using (public.is_staff()) with check (public.is_staff());

create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())
    )
  );

-- Push tokens: owner only
create policy push_tokens_owner on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Realtime: broadcast order changes for live tracking & the staff board
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;

-- ----------------------------------------------------------------------------
-- Storage policies: public read of menu photos; staff upload/manage.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('menu-photos', 'menu-photos', true)
  on conflict (id) do nothing;

create policy "menu photos public read" on storage.objects
  for select using (bucket_id = 'menu-photos');
create policy "menu photos staff write" on storage.objects
  for insert with check (bucket_id = 'menu-photos' and public.is_staff());
create policy "menu photos staff update" on storage.objects
  for update using (bucket_id = 'menu-photos' and public.is_staff());
create policy "menu photos staff delete" on storage.objects
  for delete using (bucket_id = 'menu-photos' and public.is_staff());

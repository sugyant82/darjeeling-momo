-- ============================================================================
-- Darjeeling Momo — local seed. Creates three DEV users for dev sign-in and a
-- SAMPLE menu (clearly marked is_sample = true) to be replaced via the admin
-- menu manager. Runs on `supabase db reset` / `supabase start` locally. For a
-- hosted dev project, see "Option A" in README.md (change the password first).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Dev users (password: momo1234). customer / staff / admin.
-- These exist ONLY in local Supabase. Never in production.
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  -- GoTrue cannot read NULL here; without these, sign-in fails with
  -- "Database error querying schema".
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'customer@darjeeling.test',
   crypt('momo1234', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Sample Customer"}',
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'staff@darjeeling.test',
   crypt('momo1234', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Truck Staff"}',
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'admin@darjeeling.test',
   crypt('momo1234', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Owner Admin"}',
   '', '', '', '')
on conflict (id) do nothing;

-- Email identities so password / magic-link sign-in works.
insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"customer@darjeeling.test"}', 'email', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"staff@darjeeling.test"}', 'email', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@darjeeling.test"}', 'email', now(), now(), now())
on conflict do nothing;

-- Set roles (profiles were auto-created by the on_auth_user_created trigger).
update public.profiles set role = 'staff', phone = '021 555 0102' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'admin', phone = '021 555 0103' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set phone = '021 555 0101' where id = '11111111-1111-1111-1111-111111111111';

-- ----------------------------------------------------------------------------
-- SAMPLE menu. Replace via /admin/menu. Neutral placeholder images.
-- ----------------------------------------------------------------------------
insert into public.categories (id, name, sort, is_active) values
  ('c0000000-0000-0000-0000-000000000001', 'Steamed Momos', 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'Fried Momos', 2, true),
  ('c0000000-0000-0000-0000-000000000003', 'Jhol / Soup Momos', 3, true),
  ('c0000000-0000-0000-0000-000000000004', 'Sides', 4, true),
  ('c0000000-0000-0000-0000-000000000005', 'Drinks', 5, true)
on conflict (id) do nothing;

insert into public.menu_items (id, category_id, name, description, price_cents, tags, is_available, image_url, sort, is_sample) values
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'Chicken Steamed Momo', 'Juicy minced chicken dumplings, steamed to order. SAMPLE.', 1200,
   '{"bestseller"}', true, '/images/placeholder-momo.svg', 1, true),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'Veg Steamed Momo', 'Cabbage, carrot and paneer, steamed. SAMPLE.', 1100,
   '{"veg"}', true, '/images/placeholder-momo.svg', 2, true),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002',
   'Chicken Fried Momo', 'Pan-fried crispy bottoms, soft tops. SAMPLE.', 1300,
   '{"bestseller","spicy"}', true, '/images/placeholder-momo.svg', 1, true),
  ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002',
   'Veg Fried Momo', 'Crispy veg dumplings with achar. SAMPLE.', 1200,
   '{"veg"}', true, '/images/placeholder-momo.svg', 2, true),
  ('a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003',
   'Chicken Jhol Momo', 'Steamed momos in a spiced sesame-tomato soup. SAMPLE.', 1500,
   '{"spicy","bestseller"}', true, '/images/placeholder-momo.svg', 1, true),
  ('a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003',
   'Veg Jhol Momo', 'Veg momos in warming jhol broth. SAMPLE.', 1400,
   '{"veg"}', true, '/images/placeholder-momo.svg', 2, true),
  ('a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000004',
   'Chilli Achar', 'House tomato-chilli pickle. SAMPLE.', 250,
   '{"spicy","veg"}', true, '/images/placeholder-side.svg', 1, true),
  ('a0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004',
   'Sel Roti', 'Sweet ring-shaped rice bread. SAMPLE.', 400,
   '{"veg"}', false, '/images/placeholder-side.svg', 2, true),
  ('a0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000005',
   'Masala Chai', 'Spiced milk tea. SAMPLE.', 450,
   '{"veg"}', true, '/images/placeholder-drink.svg', 1, true),
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000005',
   'Mango Lassi', 'Yoghurt and mango. SAMPLE.', 550,
   '{"veg"}', true, '/images/placeholder-drink.svg', 2, true)
on conflict (id) do nothing;

-- Options: Pieces (6/10) on momo items; Protein already split into items; Extra achar.
insert into public.item_options (id, menu_item_id, name, required, min_select, max_select, sort) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Pieces', true, 1, 1, 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Extras', false, 0, 2, 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Pieces', true, 1, 1, 1),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Pieces', true, 1, 1, 1),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'Pieces', true, 1, 1, 1)
on conflict (id) do nothing;

insert into public.option_choices (id, item_option_id, label, price_delta_cents, is_default, sort) values
  -- Chicken steamed pieces
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '6 pieces', 0, true, 1),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '10 pieces', 500, false, 2),
  -- Chicken steamed extras
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Extra achar', 250, false, 1),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Extra spicy', 0, false, 2),
  -- Veg steamed pieces
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', '6 pieces', 0, true, 1),
  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', '10 pieces', 450, false, 2),
  -- Chicken fried pieces
  ('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000004', '6 pieces', 0, true, 1),
  ('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', '10 pieces', 500, false, 2),
  -- Veg fried pieces
  ('d0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', '6 pieces', 0, true, 1),
  ('d0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-000000000005', '10 pieces', 450, false, 2)
on conflict (id) do nothing;

-- Today's truck location & hours (SAMPLE). Uses the current local date.
insert into public.locations_schedule (date, place, address, map_link, open_time, close_time, slot_minutes, max_orders_per_slot, is_closed)
values (
  (now() at time zone 'Pacific/Auckland')::date,
  'Otara Flea Market (SAMPLE)',
  'Newbury St, Otara, Auckland 2023',
  'https://maps.google.com/?q=Otara+Flea+Market',
  '10:00', '20:00', 15, 10, false
)
on conflict (date) do nothing;

-- ============================================================
-- SuperK — Seed Users (SQL-only alternative)
-- ============================================================
-- Use this if you can't run scripts/seed-users.mjs locally.
-- Run in Supabase SQL Editor AFTER 0001_init.sql and 0002_seed.sql.
--
-- This uses Supabase's internal auth.users table directly.
-- Passwords are bcrypt-hashed using crypt() with the bf scheme.
-- ============================================================

-- Helper: create or upsert an auth user + profile in one go.
-- We use the pgcrypto extension (already enabled in Supabase).
create or replace function _seed_user(
  p_email     text,
  p_password  text,
  p_full_name text,
  p_role      user_role,
  p_store     text default null,
  p_team      text default null,
  p_cats      text[] default null
) returns void as $$
declare
  v_user_id uuid;
begin
  -- See if the user already exists
  select id into v_user_id from auth.users where email = p_email;

  if v_user_id is null then
    -- Create a new auth user. We bypass the normal sign-up flow
    -- and insert directly because Supabase's SQL doesn't expose auth.admin_create_user.
    v_user_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(), null, null,
      '{"provider":"email","providers":["email"]}'::jsonb,
      json_build_object('full_name', p_full_name)::jsonb,
      now(), now(), '', '', '', ''
    );

    -- Also seed the identities row that Supabase Auth expects
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id::text,
      json_build_object('sub', v_user_id::text, 'email', p_email)::jsonb,
      'email', now(), now(), now()
    );
  end if;

  -- Upsert profile
  insert into profiles (id, full_name, role, store_code, team, categories_handled)
  values (v_user_id, p_full_name, p_role, p_store, p_team, p_cats)
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    store_code = excluded.store_code,
    team = excluded.team,
    categories_handled = excluded.categories_handled;
end;
$$ language plpgsql security definer;

-- ---------- Create the demo users ----------
select _seed_user('ramesh@superk.in',  'Welcome@123', 'Ramesh Kumar', 'sp',    'STR001');
select _seed_user('anita@superk.in',   'Welcome@123', 'Anita Reddy',  'sp',    'STR002');
select _seed_user('vikram@superk.in',  'Welcome@123', 'Vikram Singh', 'sp',    'STR003');
select _seed_user('priya@superk.in',   'Welcome@123', 'Priya Menon',  'sp',    'STR004');
select _seed_user('suresh@superk.in',  'Welcome@123', 'Suresh Naidu', 'sp',    'STR005');

select _seed_user('karthik@superk.in', 'Agent@123',   'Karthik Iyer',   'agent', null, 'Inventory Help Desk', array['Inventory']);
select _seed_user('deepa@superk.in',   'Agent@123',   'Deepa Rao',      'agent', null, 'IT Help Desk',        array['Billing']);
select _seed_user('mahesh@superk.in',  'Agent@123',   'Mahesh Gupta',   'agent', null, 'Finance',             array['Payments']);
select _seed_user('lakshmi@superk.in', 'Agent@123',   'Lakshmi Pillai', 'agent', null, 'Operations',          array['Operations']);
select _seed_user('arjun@superk.in',   'Agent@123',   'Arjun Verma',    'agent', null, 'HR',                  array['HR']);
select _seed_user('neha@superk.in',    'Agent@123',   'Neha Shah',      'agent', null, 'Marketing',           array['Marketing']);

select _seed_user('admin@superk.in',   'Admin@123',   'SuperK Admin',   'admin');

-- Clean up the helper
drop function _seed_user(text, text, text, user_role, text, text, text[]);

-- Verify
select email, raw_user_meta_data->>'full_name' as name, role as auth_role from auth.users order by email;

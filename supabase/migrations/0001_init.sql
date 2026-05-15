-- ============================================================
-- SuperK Support Portal — Database Schema
-- ============================================================
-- Run this migration in Supabase SQL Editor (or `supabase db push`)
-- Creates all tables, indexes, RLS policies, and triggers.

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================
create type ticket_status   as enum ('Open', 'In Progress', 'Resolved', 'Closed');
create type ticket_priority as enum ('Critical', 'High', 'Medium', 'Low');
create type user_role       as enum ('sp', 'agent', 'admin');

-- ============================================================
-- 2. STORES
-- ============================================================
create table stores (
  code        text primary key,
  name        text not null,
  city        text,
  state       text,
  region      text,
  asm_owner   text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- 3. PROFILES — links to auth.users with role + store mapping
--    auth.users is managed by Supabase Auth; profiles adds our fields.
-- ============================================================
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null,
  role            user_role not null,
  store_code      text references stores(code), -- nullable: only SPs have a store
  team            text,                          -- nullable: only agents have a team
  categories_handled text[],                     -- nullable: only agents
  phone           text,
  active          boolean default true,
  created_at      timestamptz default now()
);

create index profiles_role_idx       on profiles(role);
create index profiles_store_idx      on profiles(store_code);

-- ============================================================
-- 4. CATEGORIES — drives the ticket dropdown
-- ============================================================
create table categories (
  id                serial primary key,
  category          text not null,
  sub_category      text not null,
  default_priority  ticket_priority not null default 'Medium',
  routed_to_team    text,
  active            boolean default true,
  unique (category, sub_category)
);

create index categories_active_idx on categories(active);

-- ============================================================
-- 5. KNOWLEDGE BASE
-- ============================================================
create table knowledge_base (
  id            serial primary key,
  category      text not null,
  sub_category  text,
  question      text not null,
  answer        text not null,
  keywords      text, -- comma-separated for fuzzy search
  status        text default 'Active',
  owner         text,
  last_updated  timestamptz default now(),
  -- generated tsvector for full-text search
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(question, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(keywords, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(answer,   '')), 'C')
  ) stored
);

create index kb_search_idx on knowledge_base using gin(search_vector);
create index kb_category_idx on knowledge_base(category, sub_category) where status = 'Active';

-- ============================================================
-- 6. TICKETS
-- ============================================================
create table tickets (
  id                serial primary key,
  ticket_code       text unique not null default ('TKT-' || lpad(nextval('tickets_id_seq')::text, 6, '0')),
  sp_id             uuid not null references profiles(id),
  store_code        text not null references stores(code),
  category          text not null,
  sub_category      text not null,
  other_title       text, -- only filled when sub_category = 'Other'
  priority          ticket_priority not null default 'Medium',
  description       text not null,
  status            ticket_status not null default 'Open',
  assigned_to       uuid references profiles(id),
  first_response_at timestamptz,
  resolved_at       timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index tickets_sp_idx           on tickets(sp_id);
create index tickets_store_idx        on tickets(store_code);
create index tickets_status_idx       on tickets(status);
create index tickets_assigned_idx     on tickets(assigned_to);
create index tickets_category_idx     on tickets(category);
create index tickets_created_idx      on tickets(created_at desc);

-- Auto-update updated_at
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tickets_updated_at before update on tickets
  for each row execute function set_updated_at();

-- ============================================================
-- 7. TICKET MESSAGES — conversation thread
-- ============================================================
create table ticket_messages (
  id           bigserial primary key,
  ticket_id    int not null references tickets(id) on delete cascade,
  sender_id    uuid not null references profiles(id),
  sender_role  user_role not null,
  body         text not null,
  created_at   timestamptz default now()
);

create index ticket_messages_ticket_idx on ticket_messages(ticket_id, created_at);

-- When the first agent message is posted, set tickets.first_response_at
-- and bump status from Open -> In Progress.
create or replace function on_ticket_message_insert() returns trigger as $$
begin
  if new.sender_role = 'agent' then
    update tickets
       set first_response_at = coalesce(first_response_at, now()),
           status = case when status = 'Open' then 'In Progress'::ticket_status else status end
     where id = new.ticket_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger ticket_messages_after_insert after insert on ticket_messages
  for each row execute function on_ticket_message_insert();

-- ============================================================
-- 8. RLS — Row Level Security
-- ============================================================
alter table stores          enable row level security;
alter table profiles        enable row level security;
alter table categories      enable row level security;
alter table knowledge_base  enable row level security;
alter table tickets         enable row level security;
alter table ticket_messages enable row level security;

-- Helper: get my role from JWT (faster than joining profiles every time)
create or replace function auth_role() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_store() returns text
language sql stable security definer as $$
  select store_code from profiles where id = auth.uid()
$$;

create or replace function auth_categories() returns text[]
language sql stable security definer as $$
  select categories_handled from profiles where id = auth.uid()
$$;

-- ---------- stores ----------
-- Everyone authenticated can read store list (for dropdowns / labels)
create policy "stores: authenticated can read"
  on stores for select to authenticated using (true);

-- Only admin can modify stores
create policy "stores: admin write"
  on stores for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------- profiles ----------
-- Users can read their own profile; admins read all
create policy "profiles: self or admin read"
  on profiles for select to authenticated
  using (id = auth.uid() or auth_role() = 'admin' or auth_role() = 'agent');

-- Only admin can insert/update profiles (users are created via admin flow)
create policy "profiles: admin write"
  on profiles for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------- categories ----------
create policy "categories: read all"
  on categories for select to authenticated using (true);
create policy "categories: admin write"
  on categories for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------- knowledge_base ----------
create policy "kb: read all"
  on knowledge_base for select to authenticated using (status = 'Active' or auth_role() = 'admin');
create policy "kb: admin write"
  on knowledge_base for all to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------- tickets ----------
-- SPs see only their own store's tickets
create policy "tickets: sp sees own store"
  on tickets for select to authenticated
  using (
    auth_role() = 'sp' and store_code = auth_store()
  );

-- Agents see tickets in categories they handle
create policy "tickets: agent sees handled categories"
  on tickets for select to authenticated
  using (
    auth_role() = 'agent' and category = any(auth_categories())
  );

-- Admins see everything
create policy "tickets: admin sees all"
  on tickets for select to authenticated
  using (auth_role() = 'admin');

-- SPs create tickets for their own store
create policy "tickets: sp creates for own store"
  on tickets for insert to authenticated
  with check (auth_role() = 'sp' and store_code = auth_store() and sp_id = auth.uid());

-- Agents update tickets in their categories (status, assigned_to, resolution timestamps)
create policy "tickets: agent updates handled"
  on tickets for update to authenticated
  using (auth_role() = 'agent' and category = any(auth_categories()))
  with check (auth_role() = 'agent' and category = any(auth_categories()));

-- Admins update anything
create policy "tickets: admin updates"
  on tickets for update to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------- ticket_messages ----------
-- Read: same rules as the parent ticket (admin all; agent handled categories; sp own store)
create policy "messages: read by ticket visibility"
  on ticket_messages for select to authenticated
  using (
    exists (
      select 1 from tickets t
      where t.id = ticket_messages.ticket_id
        and (
          auth_role() = 'admin' or
          (auth_role() = 'agent' and t.category = any(auth_categories())) or
          (auth_role() = 'sp' and t.store_code = auth_store())
        )
    )
  );

-- Insert: the sender must be the auth user; their role must match.
create policy "messages: send on visible ticket"
  on ticket_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and sender_role = auth_role()
    and exists (
      select 1 from tickets t
      where t.id = ticket_messages.ticket_id
        and (
          auth_role() = 'admin' or
          (auth_role() = 'agent' and t.category = any(auth_categories())) or
          (auth_role() = 'sp'    and t.store_code = auth_store())
        )
    )
  );

-- ============================================================
-- 9. VIEWS — convenient aggregates for the admin dashboard
-- ============================================================
create or replace view v_store_stats as
  select
    s.code,
    s.name,
    s.city,
    s.state,
    s.region,
    s.asm_owner,
    coalesce(p.full_name, '—')                       as partner_name,
    count(t.id)                                      as total_tickets,
    count(t.id) filter (where t.status = 'Open')        as open_count,
    count(t.id) filter (where t.status = 'In Progress') as in_progress_count,
    count(t.id) filter (where t.status = 'Resolved')    as resolved_count,
    count(t.id) filter (where t.status in ('Open','In Progress'))                                as pending_count,
    count(t.id) filter (where t.priority = 'Critical' and t.status in ('Open','In Progress')) as critical_pending,
    count(t.id) filter (where t.priority = 'High'     and t.status in ('Open','In Progress')) as high_pending
  from stores s
  left join profiles p on p.store_code = s.code and p.role = 'sp'
  left join tickets t  on t.store_code = s.code
  group by s.code, s.name, s.city, s.state, s.region, s.asm_owner, p.full_name;

grant select on v_store_stats to authenticated;

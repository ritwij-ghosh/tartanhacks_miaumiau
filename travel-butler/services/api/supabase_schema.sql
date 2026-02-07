-- =============================================================
-- Travel Butler — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── 1. Conversations ──────────────────────────────────────
-- One per chat session. Linked to auth.users via user_id.
create table public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text default 'New conversation',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.conversations enable row level security;
create policy "Users see own conversations"
  on public.conversations for select using (auth.uid() = user_id);
create policy "Users create own conversations"
  on public.conversations for insert with check (auth.uid() = user_id);

-- ─── 2. Messages ───────────────────────────────────────────
-- Every chat message (user, assistant, system).
create table public.messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system')),
  content          text not null,
  intent_type      text,             -- 'flight', 'hotel', 'dining', etc.
  tool_trace       jsonb default '[]', -- array of ToolTraceEvent objects
  created_at       timestamptz default now()
);

alter table public.messages enable row level security;
create policy "Users see own messages"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );
create policy "Users create own messages"
  on public.messages for insert
  with check (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

-- ─── 3. Plans (itineraries) ────────────────────────────────
create table public.plans (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.plans enable row level security;
create policy "Users see own plans"
  on public.plans for select using (auth.uid() = user_id);
create policy "Users create own plans"
  on public.plans for insert with check (auth.uid() = user_id);
create policy "Users update own plans"
  on public.plans for update using (auth.uid() = user_id);

-- ─── 4. Plan Steps ─────────────────────────────────────────
create table public.plan_steps (
  id              uuid primary key default uuid_generate_v4(),
  plan_id         uuid not null references public.plans(id) on delete cascade,
  step_order      int not null,
  title           text not null,
  description     text default '',
  location        text,
  start_time      text,
  end_time        text,
  travel_minutes  int,
  category        text default 'activity' check (category in ('flight','hotel','dining','activity','transit')),
  created_at      timestamptz default now()
);

alter table public.plan_steps enable row level security;
create policy "Users see own plan steps"
  on public.plan_steps for select
  using (
    plan_id in (select id from public.plans where user_id = auth.uid())
  );
create policy "Users create own plan steps"
  on public.plan_steps for insert
  with check (
    plan_id in (select id from public.plans where user_id = auth.uid())
  );

-- ─── 5. Bookings ───────────────────────────────────────────
create table public.bookings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  booking_type    text not null check (booking_type in ('flight','hotel','dining')),
  tool_name       text not null,        -- e.g. 'flight.book_order'
  payload         jsonb default '{}',   -- request payload sent to tool
  status          text not null default 'pending'
                    check (status in ('pending','awaiting_approval','approved','confirmed','failed','cancelled')),
  provider_ref    text,                 -- confirmation ID from provider
  result          jsonb,                -- full response from tool
  error           text,
  created_at      timestamptz default now(),
  confirmed_at    timestamptz
);

alter table public.bookings enable row level security;
create policy "Users see own bookings"
  on public.bookings for select using (auth.uid() = user_id);
create policy "Users create own bookings"
  on public.bookings for insert with check (auth.uid() = user_id);
create policy "Users update own bookings"
  on public.bookings for update using (auth.uid() = user_id);

-- ─── 6. OAuth Tokens ───────────────────────────────────────
-- Stores Google OAuth refresh tokens for calendar export.
create table public.user_oauth_tokens (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  provider       text not null default 'google',
  access_token   text,
  refresh_token  text,
  expires_at     timestamptz,
  scopes         text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(user_id, provider)
);

alter table public.user_oauth_tokens enable row level security;
-- Only the backend (service role) reads/writes tokens — no client RLS policy needed.
-- The service role key bypasses RLS.

-- ─── Indexes ───────────────────────────────────────────────
create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_plan_steps_plan on public.plan_steps(plan_id, step_order);
create index idx_bookings_user on public.bookings(user_id, created_at desc);
create index idx_conversations_user on public.conversations(user_id, updated_at desc);

-- ─── Helpful: auto-update updated_at ───────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.handle_updated_at();

create trigger plans_updated_at
  before update on public.plans
  for each row execute function public.handle_updated_at();

create trigger oauth_tokens_updated_at
  before update on public.user_oauth_tokens
  for each row execute function public.handle_updated_at();

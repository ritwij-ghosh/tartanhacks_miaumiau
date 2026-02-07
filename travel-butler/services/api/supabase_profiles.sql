-- =============================================================
-- Travel Butler — Profiles Table + Auto-Creation Trigger
-- Run this in Supabase SQL Editor AFTER the main schema.
-- =============================================================

-- ─── Ensure handle_updated_at exists (idempotent) ──────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── Profiles table ────────────────────────────────────────
-- Stores user metadata that Supabase auth.users doesn't hold.
-- Auto-created when a user signs up (via trigger below).
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  provider    text default 'email',  -- 'email' | 'google'
  preferences jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- RLS policies
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Allow inserts from the trigger (runs as SECURITY DEFINER)
create policy "Allow profile insert"
  on public.profiles for insert with check (true);

-- ─── Auto-create profile on signup ─────────────────────────
-- This trigger fires whenever a new user is created in auth.users
-- (email signup, Google OIDC, any provider). It copies the user's
-- metadata (name, avatar, provider) into the profiles table.
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
as $$
declare
  _provider text;
begin
  -- Determine auth provider
  if new.raw_app_meta_data ->> 'provider' is not null then
    _provider := new.raw_app_meta_data ->> 'provider';
  else
    _provider := 'email';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, provider)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture',
      ''
    ),
    _provider
  );
  return new;
end;
$$ language plpgsql;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Updated_at trigger ────────────────────────────────────
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ─── Index ─────────────────────────────────────────────────
create index if not exists idx_profiles_email on public.profiles(email);

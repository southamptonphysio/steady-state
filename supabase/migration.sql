-- ─────────────────────────────────────────────────────────────────────────────
-- SteadyState — Supabase migration
-- Paste this into: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid        references auth.users(id) on delete cascade primary key,
  onboarding  jsonb,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- ── Entries ──────────────────────────────────────────────────────────────────
create table if not exists entries (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references profiles(id) on delete cascade not null,
  date        date        not null,
  morning     jsonb,
  evening     jsonb,
  synthetic   boolean     default false,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,

  unique(user_id, date)
);

alter table entries enable row level security;

create policy "Users can view own entries"
  on entries for select using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on entries for insert with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on entries for update using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on entries for delete using (auth.uid() = user_id);

-- ── Index ────────────────────────────────────────────────────────────────────
create index if not exists entries_user_date_idx on entries(user_id, date);

-- ── Auto-create profile row on signup ────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

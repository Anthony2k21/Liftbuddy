-- No1Assist Body Tracker — Supabase Schema
-- Run this in the Supabase SQL Editor (dashboard → SQL Editor → New query)

-- Enable Row Level Security on all tables (users only see their own data)

-- ─── workout_history ──────────────────────────────────────────────────────────
create table if not exists workout_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  muscle_group  text not null,
  sets          jsonb not null default '[]',
  rating        real,
  created_at    timestamptz default now()
);

alter table workout_history enable row level security;

create policy "Users see own workout_history"
  on workout_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index on workout_history (user_id, date, muscle_group);
create index on workout_history (user_id, date);

-- Migration: add session rating column (run separately if table already exists)
-- alter table workout_history add column if not exists rating real;

-- ─── workout_plans ────────────────────────────────────────────────────────────
create table if not exists workout_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  type          text,
  duration      text,
  days_per_week int,
  color         text,
  description   text,
  schedule      jsonb not null default '[]',
  created_at    timestamptz default now()
);

alter table workout_plans enable row level security;

create policy "Users see own workout_plans"
  on workout_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── daily_tracker ────────────────────────────────────────────────────────────
create table if not exists daily_tracker (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  data       jsonb not null default '{}',
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table daily_tracker enable row level security;

create policy "Users see own daily_tracker"
  on daily_tracker for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── muscle_calendar ──────────────────────────────────────────────────────────
create table if not exists muscle_calendar (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  data       jsonb not null default '{}',
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table muscle_calendar enable row level security;

create policy "Users see own muscle_calendar"
  on muscle_calendar for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

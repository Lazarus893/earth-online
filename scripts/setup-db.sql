-- Earth Online - Supabase Database Setup
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- Game state (replaces localStorage)
create table if not exists game_state (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  dimensions jsonb not null default '[]'::jsonb,
  quests jsonb not null default '[]'::jsonb,
  streak integer default 0,
  onboarding_done boolean default false,
  updated_at timestamptz default now()
);

-- AI Advisor history
create table if not exists advisor_history (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  dimension text not null,
  date date not null default current_date,
  analysis text,
  goals jsonb,
  actions jsonb,
  opportunities jsonb,
  created_at timestamptz default now(),
  unique(device_id, dimension, date)
);

-- Enable RLS but allow anonymous access via device_id
alter table game_state enable row level security;
alter table advisor_history enable row level security;

-- Policies: anyone can read/write their own device data
create policy "Users can manage own game state" on game_state
  for all using (true) with check (true);

create policy "Users can manage own advisor history" on advisor_history
  for all using (true) with check (true);

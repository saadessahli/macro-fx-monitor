create extension if not exists pgcrypto;

create table if not exists public.snapshots (
  id text primary key,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  generated_at timestamptz not null,
  payload jsonb not null,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists snapshots_generated_at_idx
  on public.snapshots (generated_at desc);

alter table public.snapshots enable row level security;

revoke all on public.snapshots from anon, authenticated;

comment on table public.snapshots is
  'Generated weekly and monthly macro snapshots. Server-only access through the service role.';

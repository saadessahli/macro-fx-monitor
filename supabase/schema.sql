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
grant select, insert, update, delete on public.snapshots to service_role;

comment on table public.snapshots is
  'Generated weekly and monthly macro snapshots. Server-only access through the service role.';

create table if not exists public.marketing_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  content_type text not null check (
    content_type in ('single', 'thread', 'educational', 'driver', 'weekly-recap', 'contrarian')
  ),
  title text not null,
  text_content text not null,
  thread_posts jsonb not null default '[]'::jsonb,
  image_card_data jsonb not null,
  video_config jsonb not null,
  snapshot_id text not null,
  snapshot_date date not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'posted')),
  manually_posted_at timestamptz,
  notes text not null default ''
);

create index if not exists marketing_drafts_created_at_idx
  on public.marketing_drafts (created_at desc);

alter table public.marketing_drafts enable row level security;

revoke all on public.marketing_drafts from anon, authenticated;
grant select, insert, update, delete on public.marketing_drafts to service_role;

comment on table public.marketing_drafts is
  'Private X content drafts. Access is restricted to server-side admin endpoints using the service role.';

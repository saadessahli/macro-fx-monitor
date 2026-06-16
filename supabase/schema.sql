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
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'needs_review', 'approved', 'rejected', 'posted')),
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

create table if not exists public.economic_calendar_events (
  id text primary key,
  event_name text not null,
  country text not null default 'US',
  currency text not null default 'USD',
  event_date date not null,
  event_time text not null default '',
  importance text not null default 'medium',
  category text not null default 'other',
  previous text not null default '',
  forecast text not null default '',
  actual text not null default '',
  source text not null,
  source_url text not null default '',
  why_it_matters text not null default '',
  is_manual boolean not null default false,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.market_news_context (
  id text primary key,
  headline text not null,
  summary text not null default '',
  source text not null default 'Manual',
  url text not null default '',
  published_at timestamptz not null default now(),
  topic text not null default 'macro',
  relevance_score integer not null default 50,
  macro_impact_category text not null default 'other',
  sentiment text not null default 'uncertain',
  dxy_relevance text not null default 'medium',
  dxy_angle text not null default '',
  is_manual boolean not null default false,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.manual_market_context (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  details text not null default '',
  context_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_daily_plans (
  plan_date date primary key,
  generated_at timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb
);

alter table public.economic_calendar_events enable row level security;
alter table public.market_news_context enable row level security;
alter table public.manual_market_context enable row level security;
alter table public.marketing_daily_plans enable row level security;

revoke all on public.economic_calendar_events from anon, authenticated;
revoke all on public.market_news_context from anon, authenticated;
revoke all on public.manual_market_context from anon, authenticated;
revoke all on public.marketing_daily_plans from anon, authenticated;

grant select, insert, update, delete on public.economic_calendar_events to service_role;
grant select, insert, update, delete on public.market_news_context to service_role;
grant select, insert, update, delete on public.manual_market_context to service_role;
grant select, insert, update, delete on public.marketing_daily_plans to service_role;

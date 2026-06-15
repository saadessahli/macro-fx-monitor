create table if not exists public.economic_calendar_events (
  id text primary key,
  event_name text not null,
  country text not null default 'US',
  currency text not null default 'USD',
  event_date date not null,
  event_time text not null default '',
  importance text not null default 'medium'
    check (importance in ('low', 'medium', 'high')),
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
  sentiment text not null default 'uncertain'
    check (sentiment in ('risk-on', 'risk-off', 'neutral', 'uncertain')),
  dxy_relevance text not null default 'medium'
    check (dxy_relevance in ('low', 'medium', 'high')),
  dxy_angle text not null default '',
  is_manual boolean not null default false,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.manual_market_context (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('note', 'event', 'headline', 'geopolitical')),
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

create index if not exists economic_calendar_event_date_idx
  on public.economic_calendar_events (event_date);
create index if not exists market_news_published_at_idx
  on public.market_news_context (published_at desc);
create index if not exists manual_market_context_date_idx
  on public.manual_market_context (context_date desc);

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

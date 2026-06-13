alter table public.marketing_drafts
  add column if not exists copied_at timestamptz,
  add column if not exists topic text not null default 'DXY',
  add column if not exists tone text not null default 'professional',
  add column if not exists instruction text not null default '',
  add column if not exists variations jsonb not null default '[]'::jsonb,
  add column if not exists quality_scores jsonb not null default '{}'::jsonb,
  add column if not exists version_number integer not null default 1,
  add column if not exists posted_url text not null default '';

create table if not exists public.marketing_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_draft_versions (
  id bigint generated always as identity primary key,
  draft_id uuid not null references public.marketing_drafts(id) on delete cascade,
  version_number integer not null,
  text_content text not null,
  thread_posts jsonb not null default '[]'::jsonb,
  quality_scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reply_opportunities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  original_url text not null default '',
  author text not null default '',
  post_text text not null,
  detected_topic text not null,
  relevance_score integer not null default 0,
  reply_short text not null,
  reply_educational text not null,
  reply_dashboard text not null,
  reply_quality_score integer not null default 0,
  promotional_risk_score integer not null default 0,
  status text not null default 'new' check (status in ('new', 'copied', 'replied', 'skipped')),
  replied_at timestamptz,
  copied_at timestamptz,
  notes text not null default ''
);

create table if not exists public.post_performance (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references public.marketing_drafts(id) on delete set null,
  reply_opportunity_id uuid references public.reply_opportunities(id) on delete set null,
  posted_url text not null default '',
  impressions integer not null default 0,
  likes integer not null default 0,
  replies integer not null default 0,
  reposts integer not null default 0,
  bookmarks integer not null default 0,
  profile_visits integer not null default 0,
  result_quality text not null default 'okay'
    check (result_quality in ('bad', 'okay', 'good', 'strong')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_drafts_topic_idx on public.marketing_drafts (topic);
create index if not exists reply_opportunities_created_at_idx
  on public.reply_opportunities (created_at desc);
create index if not exists marketing_draft_versions_draft_idx
  on public.marketing_draft_versions (draft_id, version_number desc);

alter table public.marketing_settings enable row level security;
alter table public.marketing_draft_versions enable row level security;
alter table public.reply_opportunities enable row level security;
alter table public.post_performance enable row level security;

revoke all on public.marketing_settings from anon, authenticated;
revoke all on public.marketing_draft_versions from anon, authenticated;
revoke all on public.reply_opportunities from anon, authenticated;
revoke all on public.post_performance from anon, authenticated;

grant select, insert, update, delete on public.marketing_settings to service_role;
grant select, insert, update, delete on public.marketing_draft_versions to service_role;
grant select, insert, update, delete on public.reply_opportunities to service_role;
grant select, insert, update, delete on public.post_performance to service_role;

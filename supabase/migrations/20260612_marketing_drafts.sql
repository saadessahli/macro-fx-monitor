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

-- Add needs_review, approved, rejected to the marketing_drafts status column.
-- Existing 'draft', 'ready', and 'posted' rows are preserved unchanged.
-- 'ready' remains valid forever for backward compatibility.

alter table public.marketing_drafts
  drop constraint if exists marketing_drafts_status_check;

alter table public.marketing_drafts
  add constraint marketing_drafts_status_check
  check (status in ('draft', 'ready', 'needs_review', 'approved', 'rejected', 'posted'));

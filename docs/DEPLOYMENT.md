# Free Public Deployment

This launch path is designed to start at $0.

## 1. Buttondown

Buttondown provides double opt-in, unsubscribe handling, delivery
infrastructure, and public archives. Confirm the current plan limits before
launch because newsletter pricing can change.

1. Create a Buttondown newsletter.
2. Set the newsletter name and confirmation redirect. Keep Buttondown's default
   double-opt-in behavior enabled.
3. Create an API key.
4. Save the key as the server-only `BUTTONDOWN_API_KEY`.

No custom domain is required for the initial launch.
The subscriber form does not require Supabase. Buttondown stores subscribers,
sends confirmation emails, prevents duplicate records, and provides the
unsubscribe link in sent newsletters.

## 2. Supabase

1. Create a free Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Copy the project URL and service-role key.
5. Save them as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key is server-only. Never use a `NEXT_PUBLIC_` prefix.

For the private admin workspace:

1. Enable Email authentication in Supabase Auth.
2. Create one email/password user for the administrator.
3. Copy the project's anon key.
4. Save it as `SUPABASE_ANON_KEY`.
5. Save the administrator's exact email as `ADMIN_EMAIL`.
6. In Supabase Auth URL Configuration, allow:
   - `http://localhost:3000/set-password`
   - `http://localhost:3000/auth/callback`
   - your production `/set-password` URL
   - your production `/auth/callback` URL

The login flow runs on the server. Do not use a `NEXT_PUBLIC_` prefix for
`ADMIN_EMAIL`, `SUPABASE_ANON_KEY`, or the service-role key.

## 3. GitHub

Create a public repository and add these Actions secrets:

- `FRED_API_KEY`
- `SITE_URL`
- `CRON_SECRET`

The weekly workflow runs Saturdays at 13:00 UTC. The monthly workflow runs on
the first day of each month at 14:00 UTC. Both workflows can also be run
manually.

## 4. Vercel

Import the GitHub repository into Vercel Hobby and configure:

- `FRED_API_KEY`
- `BUTTONDOWN_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_REPOSITORY_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL`

Use the generated `*.vercel.app` URL to remain completely free.
Apply `BUTTONDOWN_API_KEY` to Production and Preview, then redeploy. Do not use
a `NEXT_PUBLIC_` prefix for the Buttondown key.

After deployment, update `SITE_URL` in GitHub Actions secrets and run each
snapshot workflow manually once.

Set the GitHub Actions repository variable `SNAPSHOT_PUBLISHING_ENABLED` to
`true` only after Buttondown, Supabase, and `CRON_SECRET` are configured.
Scheduled snapshot jobs remain skipped until then.

## 5. Secret Rotation

The FRED key used during local development should be rotated before the
repository is made public, even though `.env.local` is ignored.

## 6. Launch Verification

- `/api/data-status` reports `healthy: true`
- `/snapshot` renders current data and calendar events
- the newsletter form triggers a Buttondown confirmation email for a new address
- repeating the same address does not create or reactivate a duplicate
- a confirmed subscriber can unsubscribe using Buttondown's email link
- the weekly workflow creates one Buttondown issue
- privacy, terms, disclaimer, methodology, and data-source pages resolve
- X sharing displays the generated Open Graph image

## Free-Tier Boundaries

- Buttondown plan limits and API availability should be confirmed at launch.
- Vercel Hobby is suitable for an early public portfolio project.
- Supabase Free may pause inactive projects and has resource limits.
- GitHub Actions is free for public repositories.
- True licensed real-time DXY market data is not included; the public quote is
  delayed and clearly labeled.

# Free Public Deployment

This launch path is designed to start at $0.

## 1. Buttondown

Buttondown provides double opt-in, unsubscribe handling, delivery
infrastructure, and public archives. Confirm the current plan limits before
launch because newsletter pricing can change.

1. Create a Buttondown newsletter.
2. Set the newsletter name and confirmation redirect.
3. Create an API key.
4. Save the key as `BUTTONDOWN_API_KEY`.

No custom domain is required for the initial launch.

## 2. Supabase

1. Create a free Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Copy the project URL and service-role key.
5. Save them as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key is server-only. Never use a `NEXT_PUBLIC_` prefix.

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
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_REPOSITORY_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL`

Use the generated `*.vercel.app` URL to remain completely free.

After deployment, update `SITE_URL` in GitHub Actions secrets and run each
snapshot workflow manually once.

## 5. Secret Rotation

The FRED key used during local development should be rotated before the
repository is made public, even though `.env.local` is ignored.

## 6. Launch Verification

- `/api/data-status` reports `healthy: true`
- `/snapshot` renders current data and calendar events
- the newsletter form triggers a confirmation email
- the weekly workflow creates one Buttondown issue
- privacy, terms, disclaimer, methodology, and data-source pages resolve
- LinkedIn sharing displays the generated Open Graph image

## Free-Tier Boundaries

- Buttondown plan limits and API availability should be confirmed at launch.
- Vercel Hobby is suitable for an early public portfolio project.
- Supabase Free may pause inactive projects and has resource limits.
- GitHub Actions is free for public repositories.
- True licensed real-time DXY market data is not included; the public quote is
  delayed and clearly labeled.

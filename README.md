# Macro FX Monitor

Macro FX Monitor is a public, source-backed US macro dashboard that translates
inflation, growth, Federal Reserve policy, Treasury yields, and dollar data into
a transparent DXY regime.

The project includes:

- 14 automatically refreshed macro and market series
- weighted DXY scoring from -10 to +10
- one-to-three, three-to-six, and six-to-twelve-month scenario views
- a generated weekly/monthly macro snapshot
- an upcoming economic release calendar
- a conditional DXY playbook with confirmation and invalidation
- a double-opt-in public newsletter

## Live Demo

[macro-fx-monitor.vercel.app](https://macro-fx-monitor.vercel.app)

## Repository

[github.com/saadessahli/macro-fx-monitor](https://github.com/saadessahli/macro-fx-monitor)

## Product Preview

### Global DXY Dashboard

![Macro FX Monitor global dashboard](docs/images/dashboard.png)

### Weekly Macro Snapshot

![Macro FX Monitor weekly snapshot](docs/images/snapshot.png)

### Driver Research

![Macro FX Monitor CPI research page](docs/images/driver-cpi.png)

## Screens

- `/dashboard` — global macro and DXY regime
- `/drivers/[slug]` — detailed driver research
- `/snapshot` — latest generated macro note
- `/newsletter` — free newsletter signup
- `/methodology` — scoring methodology
- `/data-sources` — source attribution and cadence

## Stack

- Next.js 15 and React 19
- TypeScript
- Recharts
- FRED API and public economic sources
- Supabase Free for generated snapshot persistence
- Buttondown for double-opt-in newsletter delivery
- Supabase Auth for the private admin workspace
- GitHub Actions for free scheduled publishing
- Vercel Hobby for public hosting

## Local Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Add a FRED API key to `.env.local`. The development server defaults to
`http://localhost:3000`.

## Verification

```bash
npm run check
npm run lint
npm run build
npm audit --audit-level=high
```

The source health endpoint is available at `/api/data-status`.

FRED history is requested from 1990 onward to keep public cache entries within
free hosting limits while preserving the windows used by the model.

## Newsletter Architecture

1. A visitor submits the website form.
2. `/api/subscribe` proxies the request to Buttondown.
3. Buttondown creates an unconfirmed subscriber and sends its double-opt-in email.
4. Existing subscribers are not overwritten or silently reactivated.
5. Buttondown handles delivery and adds an unsubscribe link to newsletter emails.
6. GitHub Actions calls the protected snapshot endpoint weekly and monthly.
7. The endpoint generates the macro note, stores it in Supabase, and publishes
   it through Buttondown.

### Enable Newsletter Signup

Create a Buttondown newsletter and API key, then add this server-only variable
in Vercel under Project Settings > Environment Variables:

```text
BUTTONDOWN_API_KEY=your_buttondown_api_key
```

Apply it to Production and Preview, then redeploy. Never prefix this variable
with `NEXT_PUBLIC_`; the API key must not be available in browser code.

Buttondown's default double-opt-in setting must remain enabled. Supabase is not
required to collect subscribers. `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are only needed for generated snapshot persistence
and scheduled newsletter publishing.

To test the live flow, submit a new address on `/newsletter`, open the
Buttondown confirmation email, confirm the subscription, and verify that the
subscriber becomes active in Buttondown. Published Buttondown emails include
the provider-managed unsubscribe link.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Private Admin

The public dashboard does not expose admin navigation. `/login` uses
server-rendered Supabase password authentication, and `/admin/*` requires both
an authenticated session and an exact match with the server-only `ADMIN_EMAIL`.

Required Vercel variables:

```text
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_EMAIL=your_admin_email@example.com
```

Create the administrator as an email/password user in Supabase Auth. Keep
`ADMIN_EMAIL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` free of the
`NEXT_PUBLIC_` prefix. The service-role key is not used by the browser or login
form. Administrator invitations return through `/auth/callback` to the private
`/set-password` activation page.

The first private feature is `/admin/marketing`, a review-only X Marketing
Agent. It never connects to the X API or publishes content automatically.

### X Marketing Workflow

1. Sign in at `/login` with the approved administrator account.
2. Open `/admin/marketing`.
3. Choose a content type: single post, four-post thread, educational concept,
   driver breakdown, weekly recap, or contrarian/risk post.
4. Select **Generate content**. The source-backed draft is saved in Supabase.
5. Review and copy the post or full thread, then publish it manually on X.
6. Mark the saved draft as ready or manually posted.

Every generated post is based on the latest stored weekly macro snapshot. When
a previous stored snapshot exists, the weekly recap compares the two scores.
Missing values are described as unavailable rather than estimated.

### Image Cards

Each saved draft includes a dark 16:9 X card preview with the DXY score, current
bias, top three drivers, scenario confirmation and invalidation, snapshot URL,
and research disclaimer. Select **Download PNG** to export a 1600 x 900 image
in the browser. The export uses `html-to-image`; no image-rendering service or
public storage bucket is required.

### Video Preview and MP4 Rendering

The admin workspace includes a five-slide, 20-second animated preview. Select
**Download render config** to save the current snapshot props. MP4 rendering is
kept local because Vercel serverless functions are not a reliable environment
for Chromium-based, long-running video renders.

To preview or render the reusable Remotion template:

```bash
npm run video:studio
npm run video:render
```

Replace `remotion/sample-props.json` with the downloaded render configuration
before running `npm run video:render`. The MP4 is written to
`out/macro-fx-update.mp4`.

### Draft Storage

Apply `supabase/migrations/20260612_marketing_drafts.sql` to the existing
Supabase project. Draft records include text, thread posts, image-card data,
video props, source snapshot identifiers, status, manual posting time, and
notes. Row-level security is enabled, browser roles have no table privileges,
and all reads and writes go through authenticated server-side admin endpoints.

Current limitations:

- Publishing to X remains manual.
- PNG export runs in the administrator's browser.
- Production MP4 rendering is not enabled on Vercel.
- The Remotion template renders MP4 locally; a future upgrade can use Remotion
  Lambda or another dedicated render worker.
- Future automatic posting requires an X developer account, explicit posting
  approval, encrypted credentials, and an auditable publish queue.
- AI-generated footage can later be added through a dedicated paid video API;
  the current version intentionally uses deterministic source-backed slides.

## Data and Legal Notice

This product uses the FRED® API but is not endorsed or certified by the Federal
Reserve Bank of St. Louis.

Some data series available through FRED are owned by third parties and may be
subject to additional restrictions. This project is educational and does not
provide investment advice.

## License

The software is available under the [MIT License](LICENSE). Data-provider terms
and third-party data rights remain separate from the software license.

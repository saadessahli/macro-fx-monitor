# Macro FX Monitor

Macro FX Monitor is a free, source-backed US macro dashboard focused on
inflation, growth, Federal Reserve policy, Treasury yields, and the US dollar.
It converts the latest data into a transparent DXY regime score, scenario
analysis, and educational market commentary.

Live site: [macro-fx-monitor.vercel.app](https://macro-fx-monitor.vercel.app)

## Main Features

- Public dashboard covering 14 macro and market series
- DXY regime score from -10 to +10
- Short-, medium-, and long-horizon scenarios
- Source-backed weekly and monthly snapshots
- Economic release calendar
- Confirmation and invalidation playbook
- Buttondown double-opt-in newsletter
- Private Supabase-authenticated X Marketing Agent
- Browser-generated 1600 x 900 X cards
- Local Remotion MP4 rendering

## Public Routes

- `/dashboard` - macro dashboard and DXY regime
- `/drivers/[slug]` - detailed driver research
- `/snapshot` - latest generated macro note
- `/newsletter` - free newsletter signup
- `/methodology` - scoring methodology
- `/data-sources` - source attribution and cadence

## Technology

- Next.js 15, React 19, and TypeScript
- Recharts
- FRED and public economic data
- Supabase Auth and server-side storage
- Buttondown newsletter delivery
- Remotion video rendering
- Vercel hosting
- GitHub Actions scheduled publishing

## Run Locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

The development server runs at `http://localhost:3000`.

Minimum public-dashboard configuration:

```env
FRED_API_KEY=your_fred_api_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never commit `.env.local`.

## Environment Variables

Server-only variables:

```env
BUTTONDOWN_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
CRON_SECRET=
OPENAI_API_KEY=
X_API_BEARER_TOKEN=
```

Do not add `NEXT_PUBLIC_` to `ADMIN_EMAIL`, `BUTTONDOWN_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, or other private credentials.

Public configuration:

```env
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_REPOSITORY_URL=
NEXT_PUBLIC_CONTACT_EMAIL=
```

## Private Admin

1. Enable email/password authentication in Supabase.
2. Create the administrator in Supabase Auth.
3. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the server-only `ADMIN_EMAIL`.
4. Apply the SQL in `supabase/schema.sql`, followed by the files in
   `supabase/migrations/`.
5. Sign in at `/login`.
6. Open `/admin/marketing`.

Anonymous visitors are redirected to `/login`. Authenticated accounts that do
not exactly match `ADMIN_EMAIL` see `Access denied.` Admin pages use `noindex`,
and robots rules exclude admin and authentication routes.

Private tables use row-level security. The `anon` and `authenticated` roles
have no direct table privileges. Drafts, settings, replies, performance data,
and stored snapshots are accessed through authenticated server routes using
the server-only Supabase service-role key.

## Newsletter

The public form sends a POST request to `/api/subscribe`. The server validates
the address, rejects the honeypot field, checks for an existing subscriber,
creates the subscriber through Buttondown, and verifies that Buttondown stored
the record before returning success.

Buttondown handles:

- Subscriber storage
- Duplicate-address behavior
- Double-opt-in confirmation emails
- Newsletter delivery
- Unsubscribe links

Add this variable to Vercel Production and Preview:

```env
BUTTONDOWN_API_KEY=your_buttondown_api_key
```

Buttondown may place new sender accounts under review. While under review,
subscriber creation or confirmation-email delivery can be rejected or delayed.
When Buttondown reports a review-state error, the API returns
`503 BUTTONDOWN_REVIEW_PENDING` instead of displaying a false success.

The app can verify that an address exists in Buttondown. It cannot independently
prove that a confirmation email reached the recipient. Check Buttondown account
status, subscriber state, and delivery logs when confirmation mail is missing.

Useful API checks:

1. Invalid email: `400 INVALID_EMAIL`
2. Missing Buttondown key: `503 NEWSLETTER_UNAVAILABLE`
3. Provider review state: `503 BUTTONDOWN_REVIEW_PENDING`
4. New registered address: `201 SUBSCRIBER_CREATED`
5. Existing address: `200 SUBSCRIBER_EXISTS`

## X Marketing Workflow

Open `/admin/marketing` after signing in.

1. Review the two or three rotating posts under **Today's suggested posts**.
2. Edit a suggestion directly and check its character count.
3. Copy it for manual posting, or generate scored variations.
4. Mark the suggestion as copied, posted, or skipped.
5. Save durable drafts in the Draft Library.
6. Record the posted URL and performance later.

The topic rotation covers DXY, CPI, PPI, PPI versus CPI, Treasury yields, Fed
expectations, macro regimes, and confirmation/invalidation. Recent draft topics
are avoided when possible. Publishing remains manual: the app does not post,
reply, like, follow, or send messages through X.

Optional AI writing:

```env
AI_ENABLED=true
OPENAI_API_KEY=your_server_only_key
AI_MODEL=gpt-5-mini
```

Without AI configuration, the deterministic source-backed generator remains
available.

## How freshness works

### Snapshot freshness

`/admin/marketing` first loads the latest weekly snapshot stored in Supabase.
That snapshot contains the DXY score, bias, strongest drivers, recent macro
releases, and a FRED release calendar captured when the snapshot was generated.
If no stored snapshot is available, the page generates a live fallback from the
configured macro sources, but that fallback is not durable until it is saved.

The scheduled GitHub Actions workflows call `/api/cron/publish-snapshot`:

- Weekly: Saturday at 13:00 UTC
- Monthly: the first day of each month at 14:00 UTC

Those schedules run only when the repository variable
`SNAPSHOT_PUBLISHING_ENABLED` is `true` and the required secrets are configured.
The cron route stores the snapshot and publishes through Buttondown.

The admin-only **Refresh latest macro snapshot** button is different: it
regenerates and stores only the weekly snapshot used by the marketing agent. It
does not publish a newsletter, send email, or post on X. The System status panel
marks a weekly snapshot stale after eight days.

### Marketing draft freshness

Saved drafts are loaded from the private Supabase `marketing_drafts` table.
They do not rewrite themselves. Clicking **Generate as new draft** creates new
copy from the latest stored snapshot, saved settings, and recent draft text.
Recent text is passed to the scoring and optional AI layers to reduce repetition.

AI-written variations require `AI_ENABLED`, `OPENAI_API_KEY`, and the admin AI
setting. Without them, the deterministic source-backed fallback generator is
used.

### Daily content plan freshness

The two or three items under **Today's suggested posts** are generated fresh
when `/admin/marketing` is rendered. They are not loaded from saved drafts.
Their topic rotation uses the current server date and avoids recently saved
draft topics when possible.

Clicking **Generate today's X plan** rebuilds the plan immediately from the
latest snapshot, current settings, current server date, and recent drafts. The
plan generation timestamp is shown in System status.

The snapshot knows the scheduled US macro releases returned by FRED when it was
generated. It does not have a general news feed and therefore does not
automatically know breaking news, geopolitical developments, FOMC commentary
outside the modeled data/calendar, or events such as US-Iran negotiations. That
would require a licensed or reviewed news API, event feed, or manually supplied
source text. X discovery additionally requires an implemented X API adapter and
valid X API access; the current project does not perform automatic discovery.

### Image and video freshness

Image cards and video configurations come from the selected saved draft. A new
draft receives image, voiceover, subtitle, and video fields based on the
snapshot used at generation time. Existing saved drafts remain historical and
do not update when a newer snapshot is generated.

PNG export is generated in the browser from the selected draft. MP4 rendering
is manual and local using the downloaded JSON and `npm run video:render`.

### Automatic versus manual

Automatic when configured:

- FRED requests use short server caches, but stored snapshots change only when
  a snapshot generation route runs.
- GitHub Actions can generate, store, and publish weekly/monthly snapshots.
- Opening the admin page generates a fresh daily suggestion plan.
- Buttondown manages subscriber confirmation and newsletter delivery.

Requires an admin click:

- Refreshing the marketing-only snapshot
- Rebuilding today's X plan without reloading the page
- Generating and saving a new X draft
- Copying or marking content as posted

Requires external services:

- Supabase: stored snapshots, drafts, settings, replies, and performance
- Buttondown: subscriber confirmation and newsletter delivery
- OpenAI API: optional AI-written variations
- X API: future discovery or posting features; neither is active now

## Download a PNG

In Visual Studio, choose an image card and select
**Download 1600 x 900 PNG**.

The responsive admin preview is separate from export. The download is drawn
directly onto a true 1600 x 900 browser canvas with a solid dark background,
large typography, full-canvas panels, drivers, confirmation, invalidation, URL,
and disclaimer.

## Render an MP4 Locally

The repository includes:

- `remotion/`
- `remotion/sample-props.json`
- `npm run video:studio`
- `npm run video:render`

The admin button downloads a JSON configuration. JSON is not a video. To
generate MP4 locally:

1. Download the JSON configuration.
2. Replace `remotion/sample-props.json` with the downloaded file.
3. Run:

```bash
npm run video:render
```

Output:

```text
out/macro-fx-update.mp4
```

Optional preview:

```bash
npm run video:studio
```

The JSON includes the generated `voiceoverScript`, subtitles settings, and
optional music settings. Put only royalty-free, generated, or personally owned
audio in `public/audio/`. Rendering remains silent when music is disabled or no
music file exists.

## Manual and Automatic Behavior

Automatic:

- Public data loading and dashboard calculations
- Scheduled snapshot generation when GitHub Actions is enabled
- Buttondown subscriber registration and provider-managed confirmation
- Draft scoring and media configuration generation

Manual:

- Reviewing and posting X content
- Marking posts as copied, posted, or skipped
- Replacing `remotion/sample-props.json`
- Running local MP4 rendering
- Adding licensed background audio

## Verification

```bash
npm run check
npm run lint
npm run build
npm run video:render
```

The source-health endpoint is `/api/data-status`.

## Current Limitations

- X publishing and reply discovery are not connected to the X API.
- PNG generation runs in the administrator's browser.
- MP4 rendering is local, not a Vercel serverless job.
- Daily suggestion statuses are lightweight browser state; saved drafts are the
  durable Supabase history.
- Buttondown account review can delay confirmation-email delivery.
- The app cannot verify inbox placement after Buttondown accepts a subscriber.
- Real-time licensed DXY market data is not included.

## Deployment and Security

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and
[SECURITY.md](SECURITY.md).

This product uses the FRED API but is not endorsed or certified by the Federal
Reserve Bank of St. Louis. It is educational research, not investment advice.

## Future plans

This project is currently free and mainly built for learning and portfolio purposes. In the future, if there is real demand, I may add premium features such as advanced dashboards, macro alerts, historical datasets, ad-free access, exports, hosted paid versions, newsletters, or data services.

## License

This project is currently source-visible for educational, learning, portfolio, and demonstration purposes only.

It is not open source. Commercial use, redistribution, resale, hosting, deployment, or use as a competing product is not permitted without written permission.

The project is free to view and study for learning purposes, but I reserve the right to monetize future versions, premium features, hosted access, newsletters, data services, alerts, or related products.

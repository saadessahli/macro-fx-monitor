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

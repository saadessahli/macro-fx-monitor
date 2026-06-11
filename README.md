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

The production URL will be added after the first Vercel deployment.

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
3. Buttondown handles spam filtering, double opt-in, delivery, and unsubscribe.
4. GitHub Actions calls the protected snapshot endpoint weekly and monthly.
5. The endpoint generates the macro note, stores it in Supabase, and publishes
   it through Buttondown.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Data and Legal Notice

This product uses the FRED® API but is not endorsed or certified by the Federal
Reserve Bank of St. Louis.

Some data series available through FRED are owned by third parties and may be
subject to additional restrictions. This project is educational and does not
provide investment advice.

## License

The software is available under the [MIT License](LICENSE). Data-provider terms
and third-party data rights remain separate from the software license.

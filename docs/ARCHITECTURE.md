# Architecture

```mermaid
flowchart LR
  Browser --> Next[Next.js on Vercel]
  Next --> FRED[FRED and public data sources]
  Next --> Supabase[(Supabase snapshots)]
  Browser --> Subscribe[/api/subscribe]
  Subscribe --> Buttondown[Buttondown subscribers]
  Actions[GitHub Actions] --> Cron[/api/cron/publish-snapshot]
  Cron --> FRED
  Cron --> Supabase
  Cron --> Buttondown
  Buttondown --> Inbox[Subscriber inbox]
```

## Trust Boundaries

- Browser code never receives provider secrets.
- Supabase service-role access is server-only.
- Scheduled publishing requires `CRON_SECRET`.
- Newsletter signups are processed by Buttondown with double opt-in.
- Public FRED proxy requests are restricted to configured dashboard series.

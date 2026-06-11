# ISM data

These files back the hybrid ISM architecture.

- `ism-manufacturing-history.csv`
- `ism-services-history.csv`

Expected CSV format:

```csv
date,value
2024-01-01,49.1
2024-02-01,47.8
```

Optional latest release override:

- `ism-manufacturing-latest.json`
- `ism-services-latest.json`

Expected JSON format:

```json
{
  "date": "2026-04-01",
  "value": 50.4,
  "notes": ["Manual official ISM update."],
  "sourceUrl": "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/"
}
```

This keeps the app stable even when full automation of official ISM history is not reliable.

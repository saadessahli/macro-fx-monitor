# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability.
Contact the project maintainer privately using the email listed in the public
repository profile.

Include a clear description, reproduction steps, and the potential impact.
Please allow reasonable time for investigation before public disclosure.

## Secrets

API keys and service-role credentials must only be stored in local or hosting
environment variables. They must never be committed to the repository or
exposed through `NEXT_PUBLIC_` variables.

# Security Policy

## Supported Versions

Security fixes are handled on the `main` branch first.

## Reporting a Vulnerability

Please do not publish exploit details in a public issue.

Use GitHub Security Advisories for this repository when available. If advisories
are not enabled, open a short public issue asking for a private contact path
without including sensitive details.

Include:

- Affected version or commit
- Deployment mode, such as local development, Docker, or self-hosted
- Reproduction steps
- Expected and actual impact

## Deployment Notes

- Ocean Blue fails closed unless password auth or explicit open mode is configured.
- Do not use `OCEAN_BLUE_ALLOW_INSECURE_NO_AUTH=true` on public networks.
- Use a long random `OCEAN_BLUE_SESSION_SECRET`.
- Rotate tunnel keys if they are exposed in logs, screenshots, or support threads.
- Treat `DATABASE_URL` and `.env` files as secrets.

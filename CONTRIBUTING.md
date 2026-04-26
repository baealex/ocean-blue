# Contributing

Thanks for helping improve Ocean Blue.

## Setup

```bash
nvm use
pnpm install
cp .env.example packages/server/.env
```

Set `OCEAN_BLUE_AUTH_PASSWORD` and `OCEAN_BLUE_SESSION_SECRET` in `packages/server/.env`.

## Development

```bash
pnpm dev:server
pnpm dev:cli:local
```

## Checks

Run these before opening a pull request:

```bash
pnpm test:ci
pnpm check
```

## Guidelines

- Keep changes focused.
- Prefer existing package boundaries and shared helpers.
- Do not commit `.env`, local databases, build output, or generated logs.
- Use "tunnel key" in user-facing docs and UI when referring to the credential
  copied from the dashboard.
- Use the existing `--token` CLI option name when documenting CLI commands.

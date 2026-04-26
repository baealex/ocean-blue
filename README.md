# Ocean Blue

> Secure tunneling service for local development - pnpm workspace monorepo

Ocean Blue lets you expose a local app through a public subdomain you control.
The web dashboard creates tunnel keys, and the CLI uses those keys to connect
your local server to Ocean Blue.

## Structure

```
ocean-blue/
├── packages/
│   ├── cli/        # ocean-blue CLI tool
│   ├── server/     # Tunnel server & API
│   ├── web/        # Web frontend (React)
│   └── shared/     # Shared types & utilities
├── pnpm-workspace.yaml
└── package.json
```

## Quick Start

### Prerequisites

- Node.js >= 22.12.0
- pnpm >= 10.10.0

### Installation

```bash
# Install dependencies for all packages
pnpm install

# Copy environment variables for local package scripts
cp .env.example packages/server/.env
# Edit packages/server/.env and set OCEAN_BLUE_AUTH_PASSWORD and OCEAN_BLUE_SESSION_SECRET
```

### Development

```bash
# Run web + server in development mode
pnpm dev:server

# Run CLI in development mode (connects to localhost:25830)
pnpm dev:cli:local
```

### Individual Package Development

```bash
# Server + Web
pnpm dev:server

# CLI only
pnpm dev:cli

# CLI with local server
pnpm dev:cli:local
```

## Build

```bash
# Build all packages
pnpm build

# Run the standard project check
pnpm check

# Run package test suites
pnpm test:ci
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:server` | Run web + server |
| `pnpm dev:cli:local` | Run CLI connecting to localhost |
| `pnpm lint` | Run Biome lint |
| `pnpm type-check` | Build shared types, then type-check packages |
| `pnpm test:ci` | Run all package test suites |
| `pnpm check` | Run lint, type-check, and build |
| `pnpm build` | Build all packages |
| `pnpm clean` | Clean all dist folders and node_modules |

## Packages

### ocean-blue

CLI tool for creating secure tunnels to localhost.

```bash
cd packages/cli
pnpm dev           # Run CLI (production server)
pnpm dev:local     # Run CLI (localhost server)
pnpm build         # Build for publishing
```

### @ocean-blue/server

Express-based tunnel server with GraphQL API.

```bash
cd packages/server
pnpm dev           # Run server with hot reload
pnpm build         # Build for production
```

### @ocean-blue/web

React-based web frontend for tunnel key and session management.

```bash
cd packages/web
pnpm dev           # Run Vite dev server
pnpm build         # Build for production
```

### @ocean-blue/shared

Shared TypeScript types and utilities.

```bash
cd packages/shared
pnpm build         # Build shared types
```

## Self-Hosting with Docker

```bash
# Copy environment variables
cp .env.example .env
# Edit .env — set OCEAN_BLUE_AUTH_PASSWORD and OCEAN_BLUE_SESSION_SECRET

# Start the service
docker compose up -d
```

## Testing Local Tunnel Flow

```bash
# Terminal 1: Start server
pnpm dev:server

# Terminal 2: Start local app on any port
# (e.g., npm start, python -m http.server 8080, etc.)

# Terminal 3: Create a tunnel key in the dashboard, then connect the CLI
ocean-blue proxy --server http://localhost:25830 --local-port 8080 --subdomain myapp --token tk_xxx
```

The CLI option is named `--token` for compatibility, but the value is the
tunnel key copied from the dashboard. The full key is shown only once.

## Authentication Modes

- `password` mode: set `OCEAN_BLUE_AUTH_PASSWORD` and `OCEAN_BLUE_SESSION_SECRET`
- `open` mode: set `OCEAN_BLUE_ALLOW_INSECURE_NO_AUTH=true` only in trusted local environments
- Optional tunnel proxy hardening:
  - `TUNNEL_PROXY_BODY_LIMIT` (default: `10mb`)
  - `TUNNEL_PROXY_RATE_LIMIT_WINDOW_MS` (default: `60000`)
  - `TUNNEL_PROXY_RATE_LIMIT_MAX` (default: `600`)

Ocean Blue is fail-closed by default. If neither mode is configured, the server exits on startup instead of silently running without auth.

## Security

- Do not commit `.env` files or local databases.
- Use a long random `OCEAN_BLUE_SESSION_SECRET`.
- Do not run `OCEAN_BLUE_ALLOW_INSECURE_NO_AUTH=true` on public networks.
- Rotate tunnel keys if they are exposed.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Publishing CLI

```bash
npm login
pnpm publish:cli
```

The local publish command runs the CLI test suite first. `npm publish` then
builds the package through `prepublishOnly` and publishes `ocean-blue@0.1.0`.

**Note**: The CLI bundles `@ocean-blue/shared` during build, so no workspace dependencies are published.

## Monorepo Benefits

1. **Shared Types**: Server and CLI share tunnel protocol types via `@ocean-blue/shared`
2. **Fast Development**: Instant type updates across packages
3. **Efficient Builds**: pnpm caches and parallelizes builds
4. **Clean Publishing**: CLI bundles dependencies, no workspace refs in npm

## Links

- **CLI Package**: [ocean-blue on npm](https://www.npmjs.com/package/ocean-blue)
- **Repository**: [github.com/baealex/ocean-blue](https://github.com/baealex/ocean-blue)

## License

MIT

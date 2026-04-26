# Ocean Blue Server

## Domain-based Routing

This server provides different functionality based on domain:

- **Main domain**: Homepage, management, tunnel key issuance
- **Subdomains**: Tunnel proxy only

## Setup

### Development

```bash
pnpm install
pnpm dev
```

### Production

```bash
pnpm build
pnpm start
```

## Docker

```bash
docker build -t ocean-blue-tunnel .
docker-compose up -d
```

### Environment Variables

- `BASE_URL`: Base URL for the server (default: `http://localhost:25830`)
- `PORT`: Server port (default: `25830`)
- `OCEAN_BLUE_AUTH_PASSWORD`: Shared password for `password` mode
- `OCEAN_BLUE_SESSION_SECRET`: Session signing secret for `password` mode
- `OCEAN_BLUE_ALLOW_INSECURE_NO_AUTH`: Enables `open` mode for trusted local environments only
- `TUNNEL_PROXY_BODY_LIMIT`: Max proxied request body buffered before rejecting (default: `10mb`)
- `TUNNEL_PROXY_RATE_LIMIT_WINDOW_MS`: Tunnel proxy rate-limit window in milliseconds (default: `60000`)
- `TUNNEL_PROXY_RATE_LIMIT_MAX`: Max proxied requests per IP inside the rate-limit window (default: `600`)
- `DATABASE_URL`: Database URL (default: SQLite)
- `LOG_LEVEL`: Log level: error, warn, info, debug (default: `info`)

## Tunnel System

1. Open the main domain and log in with the shared password, or run in `open` mode for trusted local environments.
2. Create a tunnel key from the dashboard or GraphQL API.
3. Use the `ocean-blue` CLI tool with the tunnel key to create a tunnel.
4. The tunnel is accessible at `{subdomain}.{your-domain}`.

## Database

```bash
npx prisma migrate deploy
npx prisma generate
```

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
docker run -d \
    -v ./data:/data \
    -p 25830:25830 \
    baealex/ocean-blue
```

### Environment Variables

- `BASE_URL`: Base URL for the server (default: `http://localhost:25830`)
- `PORT`: Server port (default: `25830`)
- `OCEAN_BLUE_AUTH_PASSWORD`: Optional shared password for `password` mode
- `OCEAN_BLUE_SESSION_SECRET`: Session signing secret required with `OCEAN_BLUE_AUTH_PASSWORD`
- `OCEAN_BLUE_ALLOW_INSECURE_NO_AUTH`: Explicitly forces `open` mode for trusted local environments only
- `TUNNEL_PROXY_BODY_LIMIT`: Max proxied request body buffered before rejecting (default: `10mb`)
- `TUNNEL_PROXY_RATE_LIMIT_WINDOW_MS`: Tunnel proxy rate-limit window in milliseconds (default: `60000`)
- `TUNNEL_PROXY_RATE_LIMIT_MAX`: Max proxied requests per IP inside the rate-limit window (default: `600`)
- `DATABASE_URL`: Database URL (default: SQLite)
- `LOG_LEVEL`: Log level: error, warn, info, debug (default: `info`)

## Tunnel System

1. Open the main domain. The server starts in local open mode unless password mode is configured.
2. Create a tunnel key from the dashboard or GraphQL API.
3. Use the `ocean-blue` CLI tool with the tunnel key to create a tunnel.
4. The tunnel is accessible at `{subdomain}.{your-domain}`.

## Database

```bash
npx prisma migrate deploy
npx prisma generate
```

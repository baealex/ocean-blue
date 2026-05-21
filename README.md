# Ocean Blue

**Self-hosted, open-source tunneling service** for local development and public subdomains.

Expose your local app. Own the tunnel server. No hosted account required.

> Ocean Blue gives your local app a clear public route through a server you control.

### Why Ocean Blue?

- **Self-hosted tunnel server**: Run the dashboard, API, and proxy yourself.
- **Simple CLI**: Connect a local port with one `ocean-blue proxy` command.
- **Subdomain routing**: Claim names like `myapp` and open `myapp.localhost:25830`.
- **Tunnel keys**: Create a key in the dashboard and use it from the CLI.
- **Quick setup**: The server starts in local open mode by default.

<br>

## Quick Start

Start the server:

```bash
docker run -d \
    -v ./data:/data \
    -p 25830:25830 \
    baealex/ocean-blue
```

Open `http://localhost:25830`, then create a tunnel key. The full key is shown once.

Start any local app:

```bash
python3 -m http.server 3000
```

Connect it through Ocean Blue:

```bash
npx ocean-blue proxy \
    --server http://localhost:25830 \
    --local-port 3000 \
    --subdomain myapp \
    --token tk_xxx
```

Open `http://myapp.localhost:25830`.

<br>

## Password Mode

Use password mode when the dashboard is exposed beyond a trusted local network:

```bash
docker run -d \
    -e OCEAN_BLUE_AUTH_PASSWORD=change-me \
    -e OCEAN_BLUE_SESSION_SECRET=replace-with-long-random-secret \
    -v ./data:/data \
    -p 25830:25830 \
    baealex/ocean-blue
```

<br>

## CLI

Install globally if preferred:

```bash
npm install -g ocean-blue
```

Save a tunnel key through the server auth flow:

```bash
npx ocean-blue auth --login --server http://localhost:25830
```

After that, `--token` can be omitted:

```bash
npx ocean-blue proxy \
    --server http://localhost:25830 \
    --local-port 3000 \
    --subdomain myapp
```

| Command | Purpose |
|---------|---------|
| `ocean-blue proxy --server <url> --local-port <port> --subdomain <name> --token <key>` | Start a tunnel |
| `ocean-blue auth --login --server <url>` | Save a key through the browser auth flow |
| `ocean-blue auth --status` | Check saved key status |
| `ocean-blue auth --logout` | Remove the saved key |

<br>

## From Source

```bash
pnpm install
cp .env.example packages/server/.env
pnpm dev:server
```

In another terminal:

```bash
pnpm dev:cli:local
```

Useful checks:

```bash
pnpm test:ci
pnpm check
pnpm smoke:cli-package
pnpm smoke:tunnel
```

<br>

## Features

| Feature | Description |
|---------|-------------|
| Dashboard | Create tunnel keys and inspect sessions |
| CLI proxy | Expose a local port through an Ocean Blue server |
| Session view | See connected subdomains and owning keys |
| Password auth | Protect the dashboard with a shared password |
| SQLite storage | Simple default storage through Prisma |
| Docker image | Run the server with Docker |

<br>

## Security

- Keep tunnel keys private.
- The default server mode is intended for trusted local use.
- Use password mode before exposing the dashboard publicly.
- Rotate tunnel keys if they are exposed.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

<br>

## Links

- npm: [ocean-blue](https://www.npmjs.com/package/ocean-blue)
- Repository: [github.com/baealex/ocean-blue](https://github.com/baealex/ocean-blue)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT

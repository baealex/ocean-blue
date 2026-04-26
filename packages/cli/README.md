# Ocean Blue CLI

Expose a local app through an Ocean Blue tunnel.

## Install

```bash
npm install -g ocean-blue
```

## Usage

```bash
ocean-blue proxy --server http://localhost:25830 --local-port 3000 --subdomain myapp --token tk_xxx
```

The `--token` value is the tunnel key copied from the Ocean Blue dashboard. If
it is omitted, the CLI uses a saved key first and then starts the server auth
flow.

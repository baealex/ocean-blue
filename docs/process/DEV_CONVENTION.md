# Ocean Blue Dev Convention

Updated: 2026-04-26

## 1. Base Environment
- Node.js: `>=22.12.0`
- Package manager: `pnpm@10.10.0`
- Workspace: `packages/*` through pnpm workspace

## 2. Local Development Commands
- Server and web dev mode: `pnpm dev:server`
- CLI dev mode: `pnpm dev:cli`
- CLI local server mode: `pnpm dev:cli:local`
- Full build: `pnpm build`
- Production server start: `pnpm start`
- Tunnel smoke test: `pnpm smoke:tunnel`

## 3. Standard Quality Checks
- `pnpm lint`
- `pnpm test:ci`
- `pnpm type-check`
- `pnpm build`
- `pnpm check`

## 4. Minimum Rules Before PR
1. Complete local validation for the changed scope.
2. Push only when CI is expected to pass.
3. Document script, env, and doc changes in the PR body.
4. Validate PR metadata before sharing a PR link:
   - Title: `<emoji> <subject>` with a Unicode emoji only.
   - Body sections: write each section as a Markdown H2 heading using the exact shortcode labels, for example `## :dart: Goal`.
   - Required section labels: `:dart: Goal`, `:hammer_and_wrench: Core Changes`, `:brain: Key Decisions`, `:test_tube: Verification Guide`, `:white_check_mark: Checklist`.
   - Commit format: `<emoji> <subject>` with a Unicode emoji only.

## 5. Server and Release Linked Rules
- Server start script includes `prisma migrate deploy`.
- Docker image publishing is handled by `.github/workflows/BUILD_IMAGE.yml`.
- CLI publishing is local-first: run `npm login`, then `pnpm publish:cli`.
- CLI package version is controlled in `packages/cli/package.json`.
- Do not commit `.env`, local databases, `node_modules`, or `dist` output.

## 6. Related Documents
- Git rules: `docs/process/GIT_CONVENTION.md`
- Deployment and release: `docs/process/DEPLOYMENT_RELEASE_STRATEGY.md`
- Security policy: `SECURITY.md`
- Contribution guide: `CONTRIBUTING.md`

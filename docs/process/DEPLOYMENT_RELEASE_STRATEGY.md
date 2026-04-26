# Ocean Blue Deployment and Release Strategy

Updated: 2026-04-26

## 1. Current Deployment Channels
1. npm distribution
- Published package: `ocean-blue` (`packages/cli`)
- Run via: `npx ocean-blue` or `npx ocean-blue@<version>`
- Publish mode: local maintainer machine only

2. Docker distribution
- Image: `baealex/ocean-blue`
- Tags: manually selected during workflow dispatch, for example `latest` or `0.1.0`
- Multi-arch targets: `linux/amd64`, `linux/arm64/v8`
- Publish mode: manual GitHub Actions workflow dispatch

3. Source-based run
- `pnpm install && pnpm build && pnpm start`

## 2. Versioned Install and Run Rules
1. Production
- CLI: `npx ocean-blue@<exact-version>`
- Docker: `baealex/ocean-blue:<exact-version>`
- Do not use floating `latest` in production.

2. Fast trial/development
- CLI: `npx ocean-blue` or `npx ocean-blue@latest`
- Docker: `baealex/ocean-blue:latest`

3. Rollback target
- CLI: `npx ocean-blue@<previous-version>`
- Docker: `baealex/ocean-blue:<previous-version>`

## 3. Release Trigger Policy
- Ocean Blue does not publish npm packages automatically from GitHub Actions.
- CLI npm publish is always a local maintainer action.
- Docker image publish is always a manual GitHub Actions dispatch.
- CI success is required before release, but CI success does not trigger deployment by itself.

## 4. CLI npm Release Runbook
1. Confirm the target version in `packages/cli/package.json`.

```bash
node -p "require('./packages/cli/package.json').version"
```

2. Confirm the version is not already published.

```bash
npm view ocean-blue@<version> version
```

3. Run project validation.

```bash
pnpm check
```

4. Verify the package contents.

```bash
pnpm -F ocean-blue build
cd packages/cli
npm pack --dry-run
```

Expected package contents:
- `dist/cli.js`
- `dist/index.js`
- `dist/index.d.ts`
- `README.md`
- `LICENSE`
- `package.json`

5. Publish locally.

```bash
npm login
pnpm publish:cli
```

`pnpm publish:cli` runs the CLI test suite first. `npm publish` then runs
`prepublishOnly`, builds the CLI package, and publishes with `--access public`.

6. Verify npm publication.

```bash
npm view ocean-blue@<version> version
npx ocean-blue@<version> --version
```

## 5. Docker Image Release Runbook
1. Confirm CI is green for the target commit.

```bash
gh run list --workflow ci.yml --limit 5
```

2. Open the manual Docker image workflow.

```bash
gh workflow run BUILD_IMAGE.yml -f tag=<version>
```

For a development or trial image, use:

```bash
gh workflow run BUILD_IMAGE.yml -f tag=latest
```

3. Monitor the workflow.

```bash
gh run list --workflow BUILD_IMAGE.yml --limit 5
```

4. Verify the pushed image.

```bash
docker pull baealex/ocean-blue:<version>
```

## 6. Version and Tag Policy
- CLI package version is controlled by `packages/cli/package.json`.
- Docker tag is selected manually when running `BUILD_IMAGE.yml`.
- Use exact semver tags for production images, for example `0.1.0`.
- Use `latest` only for trial or development distribution.
- Git tags are release records, not automatic deployment triggers.

Recommended release record tags:
- CLI release: `cli-v<version>`
- Docker image release: `docker-v<version>`
- Combined release: `v<version>`

## 7. Recovery Guide
1. If npm publish fails before the package is created, fix the issue and rerun:

```bash
pnpm publish:cli
```

2. If npm publish succeeds but local verification fails, inspect the published package:

```bash
npm view ocean-blue@<version>
npx ocean-blue@<version> --version
```

3. If Docker publish fails, rerun the manual workflow with the same tag after fixing the issue.

```bash
gh workflow run BUILD_IMAGE.yml -f tag=<version>
```

4. If the wrong Docker tag was pushed, publish the correct tag and avoid using the bad tag.
DockerHub tags are mutable, but production users should move only to verified exact tags.

## 8. Release Note Policy
1. Release notes are required for public releases.
2. Before writing the note, inspect the range:

```bash
git log <previous-release-tag>..HEAD --pretty=format:"%h %s"
```

3. Patch release notes should be short and user-facing.
4. Minor release notes should include setup or migration guidance when behavior changes.
5. Include exact install or run commands when npm, Docker, auth, env, or startup behavior changes.

## 9. Required Secrets
- Docker image publishing requires `DOCKERHUB_USERNAME`.
- Docker image publishing requires `DOCKERHUB_TOKEN`.
- CLI npm publishing does not require GitHub secrets because it is local-first.

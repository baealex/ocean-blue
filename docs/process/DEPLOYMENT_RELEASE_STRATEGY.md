# Ocean Blue Deployment and Release Strategy

Updated: 2026-04-29

## 1. Current Deployment Channels
1. npm distribution
- Published package: `ocean-blue` (`packages/cli`)
- Run via: `npx ocean-blue`
- Publish mode: manual GitHub Actions workflow dispatch through npm Trusted Publishing (OIDC)

2. Docker distribution
- Image: `baealex/ocean-blue`
- Tag: `latest`
- Multi-arch targets: `linux/amd64`, `linux/arm64/v8`
- Publish mode: manual GitHub Actions workflow dispatch

3. Source-based run
- `pnpm install && pnpm build && pnpm start`

## 2. Initial Release Policy
- Ocean Blue does not use Git release tags yet.
- Ocean Blue does not maintain Docker version tags yet.
- Docker publishing uses `baealex/ocean-blue:latest` only.
- CLI publishing is npm-based through GitHub Actions Trusted Publishing, so `packages/cli/package.json` must contain a valid npm package version.
- Do not introduce release tags, versioned Docker tags, or automated publish triggers until the release process is intentionally upgraded.

## 3. Release Trigger Policy
- Ocean Blue does not publish npm packages automatically from GitHub Actions.
- CLI npm publish is always a manual GitHub Actions workflow dispatch.
- CLI npm publish uses npm Trusted Publishing (OIDC), not an `NPM_TOKEN` secret.
- Docker image publish is always a manual GitHub Actions dispatch and always pushes `latest`.
- CI success is required before release, but CI success does not trigger deployment by itself.

## 4. CLI npm Release Runbook
1. Confirm the target version in `packages/cli/package.json`.

```bash
node -p "require('./packages/cli/package.json').version"
```

2. Confirm the package version is not already published.

```bash
npm view ocean-blue@<version> version
```

3. Confirm CI is green for the target commit.

```bash
gh run list --workflow ci.yml --limit 5
```

4. Run local project validation when preparing the release PR or verifying a release candidate.

```bash
pnpm check
```

5. Verify the package contents.

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

6. Confirm npm Trusted Publishing is registered for the package and workflow.

Expected npm package trusted publisher settings:
- Package: `ocean-blue`
- Provider: GitHub Actions
- Repository: `baealex/ocean-blue`
- Workflow filename: `PUBLISH_CLI.yml`
- Environment name: match the workflow environment if one is configured

7. Open the manual npm publish workflow after the release PR is merged.

```bash
gh workflow run PUBLISH_CLI.yml
```

The workflow must request `id-token: write` and publish from `packages/cli` without `NPM_TOKEN`. npm validates the GitHub OIDC token against the package Trusted Publisher registration.

8. Monitor the workflow.

```bash
gh run list --workflow PUBLISH_CLI.yml --limit 5
```

9. Verify npm publication.

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
gh workflow run BUILD_IMAGE.yml
```

3. Monitor the workflow.

```bash
gh run list --workflow BUILD_IMAGE.yml --limit 5
```

4. Verify the pushed image.

```bash
docker pull baealex/ocean-blue:latest
```

## 6. Version and Tag Policy
- CLI package version is controlled by `packages/cli/package.json`.
- Docker image publishing currently uses `latest` only.
- Git release tags are not part of the current release process.
- Do not add versioned Docker tags until the deployment policy is updated first.

## 7. Recovery Guide
1. If npm publish fails before the package is created, fix the issue and rerun the manual workflow:

```bash
gh workflow run PUBLISH_CLI.yml
```

2. If npm publish succeeds but local verification fails, inspect the published package:

```bash
npm view ocean-blue@<version>
npx ocean-blue@<version> --version
```

3. If Docker publish fails, rerun the manual workflow after fixing the issue.

```bash
gh workflow run BUILD_IMAGE.yml
```

4. If a bad `latest` image was pushed, fix the issue and rerun the manual workflow.
DockerHub tags are mutable, so the new `latest` image replaces the previous one.

## 8. Release Note Policy
1. Release notes are required for public releases.
2. Before writing the note, inspect the relevant commits:

```bash
git log --pretty=format:"%h %s"
```

3. Patch release notes should be short and user-facing.
4. Minor release notes should include setup or migration guidance when behavior changes.
5. Include exact install or run commands when npm, Docker, auth, env, or startup behavior changes.

## 9. Required Secrets
- Docker image publishing requires `DOCKERHUB_USERNAME`.
- Docker image publishing requires `DOCKERHUB_TOKEN`.
- CLI npm publishing does not require `NPM_TOKEN`; npm Trusted Publishing uses GitHub Actions OIDC.

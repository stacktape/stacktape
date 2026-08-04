# Releasing Stacktape v4

`.github/workflows/release.yml` is the only release path. It always builds and verifies the same six platform
archives, checksum manifest, and npm tarball. The explicit channel changes only the public pointers:

| Channel   | Version example   | npm tag   | GitHub release | Installer endpoint                       |
| --------- | ----------------- | --------- | -------------- | ---------------------------------------- |
| `preview` | `4.0.0-preview.1` | `preview` | Prerelease     | `https://installs-preview.stacktape.com` |
| `stable`  | `4.0.0`           | `latest`  | Latest         | `https://installs.stacktape.com`         |

Stable releases are accepted only from `main`. Preview releases may also be dispatched from `v4/integration` until
the v4 cutover. Neither channel deploys a Stacktape project or uses `STACKTAPE_API_KEY`.

## Normal use

The local command validates its arguments and dispatches GitHub Actions; it never builds or publishes locally:

```powershell
pnpm release:preview 4.0.0-preview.1
pnpm release 4.0.0
```

Use `--ref <branch>` only when the desired commit is already pushed. Follow a run with:

```powershell
gh run list --repo stacktape/stacktape --workflow release.yml --limit 1
gh run watch <run-id> --repo stacktape/stacktape
```

Every npm version and GitHub release is immutable. Increment the preview sequence instead of attempting to overwrite
an existing version. Verify a preview with:

```powershell
npm view stacktape@4.0.0-preview.1 version
npm view stacktape dist-tags.preview
pnpm dlx stacktape@preview version
```

The installer upload is a separate dependent job. If only that job fails, use GitHub's **Re-run failed jobs** action;
the already successful npm publication is not repeated.

## Authentication boundaries

The workflow uses no long-lived publishing secret:

- `release-publish` grants the npm/GitHub publication job GitHub OIDC. npm trusts only `release.yml` in this
  environment.
- `release-installers` grants a separate job GitHub OIDC access to the AWS role
  `arn:aws:iam::977946299200:role/stacktape-github-release-installers`.
- The AWS role may upload only the seven known installer paths in the production and preview buckets, read them back
  for checksum verification, and create/read invalidations for the two corresponding CloudFront distributions. It
  cannot list buckets, write another object path, invalidate another distribution, or deploy infrastructure.

`publish-install-scripts.ts` replaces the release version in the seven canonical sources, uploads exact bytes with
SHA-256 checksums and preserved cache/content headers, checks S3's stored checksums, invalidates only those seven CDN
paths, waits for completion, and verifies every public response byte-for-byte.

## One-time configuration

The AWS and GitHub portions were provisioned on 2026-08-03:

- AWS account `977946299200` contains GitHub's OIDC provider and the narrow installer role above.
- GitHub environments `release-publish` and `release-installers` allow `main` and `v4/integration`.
- `release-installers` contains the account, role, region, bucket, distribution, and public-URL variables for both
  channels. These are identifiers, not secrets.

The remaining owner-only step is npm trusted publishing. npm supports one trusted publisher per package, so both
channels intentionally use the same `release-publish` environment:

```powershell
npm login
npm --version # must be 11.15.0 or newer; the workflow pins 11.16.0
npm trust list stacktape
npm trust github stacktape --repo stacktape/stacktape --file release.yml --env release-publish --allow-publish
npm trust list stacktape
```

npm permits only one trusted publisher per package. If `npm trust list stacktape` shows the old release setup, first
replace it with `npm trust revoke stacktape --id <existing-id>`, then run the `npm trust github` command above.

Do not add `NPM_TOKEN`, AWS access keys, or `STACKTAPE_API_KEY` to the workflow. After v4 becomes the default branch,
remove the temporary `v4/integration` branch policy from both release environments.

## Other mutable publications

The old release also invoked the CLI to update schemas and generated AI documentation. Those endpoints remain
separate from v4 npm/binary releases for now; do not reintroduce a Stacktape API key into `release.yml` to publish
them. When they are reconnected, give their exact buckets/distributions the same direct-OIDC treatment.

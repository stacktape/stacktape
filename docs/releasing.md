# Publishing Stacktape CLI releases

This is the reusable publishing procedure. Track v4-specific launch actions in
[V4 launch readiness](../apps/console/documents/releases/v4-readiness.md) (private), and product priorities in the
[owner's checklist](../apps/console/documents/releases/v4-product-checklist.md). Publication does not deploy Console.

`.github/workflows/release.yml` is the only release path. It always builds and verifies the same six platform archives,
checksum manifest, and npm tarball. The explicit channel changes only the public pointers:

| Channel   | Version example   | npm tag   | GitHub release | Installer endpoint                       |
| --------- | ----------------- | --------- | -------------- | ---------------------------------------- |
| `preview` | `4.0.0-preview.1` | `preview` | Prerelease     | `https://installs-preview.stacktape.com` |
| `stable`  | `4.0.0`           | `latest`  | Latest         | `https://installs.stacktape.com`         |

Both top-level release commands dispatch the workflow from `main`, and stable releases are accepted only from `main`.
Neither channel deploys a Stacktape project or uses `STACKTAPE_API_KEY`.

## Qualify a release candidate

Run this sequence from a checkout of the candidate's exact public revision and recorded Console revision, before
publication. Use the six archives, `SHA256SUMS` and npm tarball assembled for that candidate; do not substitute
artifacts from another build. Record both Git SHAs, artifact hashes, tool versions and the lane results in the release
record. A missing prerequisite or failed lane blocks qualification. Publication still requires the owner's
authorization.

The local/service lanes below run sequentially. Docker, PostgreSQL, MiniStack and the pinned corpus need their normal
prerequisites ([packaging](../apps/cli/scripts/packaging-archives/README.md), [Console](testing/console.md),
[corpus](project-qualification.md)). The corpus executes reviewed project code on this host. Split its full run with
`--shard=1/N` through `--shard=N/N` when necessary; every shard must pass on the same revision. Run each command
separately when a session has a foreground time limit.

```bash
set -euo pipefail
# Supply absolute paths and the exact immutable version outside this block.
: "${RC_DIRECTORY:?candidate archives, SHA256SUMS and npm tarball directory}"
: "${RC_VERSION:?exact release candidate version}"
pnpm install --frozen-lockfile
pnpm check:integrated

# Install and invoke the supplied npm package and native binary on this host, without rebuilding them.
pnpm --filter @stacktape/cli test:release-artifact -- --candidate-dir "$RC_DIRECTORY" --version "$RC_VERSION"

for suite in '' --runner --gitlab --security --issues --incidents --incident-agent --sign-up --isolated-browser; do
  if [ -n "$suite" ]; then
    pnpm --filter @stacktape/console-api-app test:db "$suite"
  else
    pnpm --filter @stacktape/console-api-app test:db
  fi
done
pnpm --filter @stacktape/console-api-app test:runner:scripts
pnpm --filter @stacktape/console-api-app test:runner:cache
pnpm --filter @stacktape/ui-react test:e2e
pnpm --filter @stacktape/bitbucket-forge-app test:e2e
pnpm test:console:browser:smoke

for lane in test:docker-smoke test:node-lambda-e2e test:web-framework-e2e test:es-image-deps-e2e \
  test:directory-inventory-e2e test:lambda-source-map-e2e test:split-assets-e2e; do
  pnpm --filter @stacktape/packaging run "$lane"
done
for lane in test:lambda-archives test:asset-replacer test:docker-preparation test:layer-upload \
  test:layer-upload:ministack test:fresh-install test:external-tools; do
  pnpm --filter @stacktape/cli run "$lane"
done
pnpm --filter @stacktape/cli test:init:real-project-corpus -- --all
pnpm --filter @stacktape/cli test:init:synthetic-project-corpus
pnpm --filter @stacktape/cli test:init:synthetic-project-corpus:native
pnpm qualify:projects -- --preset=all --lanes=import,package --allow-host-project-code
pnpm qualify:projects -- --lanes=runtime
```

Repeat supplied-artifact installation on all six native OS/architecture/libc targets. The shell fixtures in
`test:external-tools` run on Linux/macOS; the Windows artifact must separately exercise its bundled Session Manager
plugin. Qualify Windows-host packaging on Windows and execute its archives in the Linux runtime. A cross-build on one
host does not qualify another target. Authenticated hosted-login/provider browser acceptance remains a separately
reserved shared-dev run; these local lanes do not claim to cover hosted identity or provider installation.

Then run the live canaries sequentially in a genuinely disposable connected account, following the
[live AWS guards](testing/live-aws.md) and [recovery procedure](../apps/cli/scripts/real-aws/README.md). Inject
credentials into the environment without recording them. Set all required guard variables from that procedure, including
explicit account, profile, region, owner and disposable-account acknowledgement. Verify STS before mutation. Use the
extracted candidate binary for packaging/init; the alias canary currently uses the source CLI at this revision.

```bash
set -euo pipefail
: "${RC_BINARY:?absolute extracted candidate binary path}"
: "${RC_VERSION:?exact release candidate version}"
: "${RC_RUN_ID:?unique lowercase run identifier, at most 20 characters}"
[[ "$RC_RUN_ID" =~ ^[a-z0-9][a-z0-9-]{0,19}$ ]]
mkdir -p .stacktape
scenario_number=0
: "${STP_CONSOLE_DEV_RESERVATION:?task-owned reservation for runner qualification}"
pnpm console:dev:reservation check
: "${RC_RUNNER_AMI:?AMI built with the same candidate CLI version}"
: "${RC_AWS_ACCOUNT_ID:?explicit expected account for runner qualification}"
: "${RC_AWS_REGION:?explicit qualification region}"
# Set AWS_PROFILE explicitly for the reserved Console dev account (977946299200).
for mode in --image-smoke --live --slots --performance --resume --startup-recovery; do
  pnpm --filter @stacktape/console-api-app test:runner:aws "$mode" \
    --ami "$RC_RUNNER_AMI" --account "$RC_AWS_ACCOUNT_ID" --region "$RC_AWS_REGION" --expected-cli-version "$RC_VERSION"
done
pnpm console:dev:reservation release
export STP_AWS_CANARY_CLI_PATH="$RC_BINARY"
export STP_AWS_CANARY_EXPECTED_CLI_VERSION="$RC_VERSION"
for scenario in lambda-packaging-update init-static-site init-node-container init-python-container init-postgres-migration; do
  scenario_number=$((scenario_number + 1))
  export STP_AWS_CANARY_PROJECT_NAME="v4canary-${RC_RUN_ID}-${scenario_number}"
  export STP_AWS_CANARY_STATE_FILE="$(pwd)/.stacktape/${STP_AWS_CANARY_PROJECT_NAME}.json"
  pnpm test:aws --aws-scenario="$scenario"
  # The runner verifies deletion. Recover any incomplete cleanup before proceeding.
done
export STP_AWS_ALIAS_CANARY_PROJECT_NAME="v4aliascanary-${RC_RUN_ID}"
export STP_AWS_ALIAS_CANARY_STATE_FILE="$(pwd)/.stacktape/${STP_AWS_ALIAS_CANARY_PROJECT_NAME}.json"
pnpm test:aws --aws-scenario=lambda-alias-configuration-update
```

Keep the canary reports and verified-cleanup results with the release record. Never resume from a cached live result.
When a new database feature flag or heavy lane is added, add it to this sequence and to
`scripts/workspace/test-plan.ts`.

## Normal use

The local command validates its arguments and dispatches GitHub Actions; it never builds or publishes locally:

```sh
pnpm release:preview 4.0.0-preview.1
pnpm release 4.0.0
```

The low-level CLI release script accepts `--ref <branch>` for an intentionally configured preview source; ordinary
releases should use the top-level commands above. Follow a run with:

```sh
gh run list --repo stacktape/stacktape --workflow release.yml --limit 1
gh run watch <run-id> --repo stacktape/stacktape
```

Every npm version and GitHub release is immutable. Increment the preview sequence instead of attempting to overwrite an
existing version. Verify a preview with:

```sh
npm view stacktape@4.0.0-preview.1 version
npm view stacktape dist-tags.preview
pnpm dlx stacktape@preview version
```

The installer upload is a separate dependent job. If only that job fails, use GitHub's **Re-run failed jobs** action;
the already successful npm publication is not repeated.

npm can accept an upload before the version becomes publicly available. The workflow waits up to 15 minutes for its
dist-tag and preserves the GitHub assets once npm publication has been attempted. A temporary registry 404 does not
prove that the version is unpublished.

If npm accepted the package but the publication job failed afterward, wait until `npm view stacktape@<version> version`
succeeds, then recover through the same workflow:

```sh
gh workflow run release.yml --repo stacktape/stacktape --ref main \
  -f channel=preview -f version='<original-version>' -f recovery_run_id='<original-run-id>'
```

Use the original run ID and its version/channel. Recovery requires a successful public gate, all platform builds,
candidate assembly and npm upload in that original run. It downloads those original artifacts, matches the npm tarball
integrity and current channel tag, restores missing GitHub assets, exercises the public launcher, and publishes the
installers. It never rebuilds, republishes npm or overwrites an existing asset. The original candidate artifact must
still be retained by GitHub Actions. A failure before npm upload needs investigation before removing an unused release
or choosing another immutable version.

## Authentication boundaries

The workflow uses no long-lived publishing secret:

- `release-publish` grants the npm/GitHub publication job GitHub OIDC. npm trusts only `release.yml` in this
  environment.
- `release-installers` grants a separate job GitHub OIDC access to the AWS role
  `arn:aws:iam::977946299200:role/stacktape-github-release-installers`.
- The AWS role may upload only the seven known installer paths in the production and preview buckets, read them back for
  checksum verification, and create/read invalidations for the two corresponding CloudFront distributions. It cannot
  list buckets, write another object path, invalidate another distribution, or deploy infrastructure.

`publish-install-scripts.ts` replaces the release version in the seven canonical sources, uploads exact bytes with
SHA-256 checksums and preserved cache/content headers, checks S3's stored checksums, invalidates only those seven CDN
paths, waits for completion, and verifies every public response byte-for-byte.

## Configuration

AWS account `977946299200` contains GitHub's OIDC provider and the narrow installer role. GitHub environments
`release-publish` and `release-installers` must allow only `main`; the installer environment holds the account, role,
region, bucket, distribution and public-URL identifiers for both channels.

For a new setup, configure npm trusted publishing as the package owner. npm supports one trusted publisher per package,
so both channels intentionally use the same `release-publish` environment:

```sh
npm login
npm --version # must be 11.15.0 or newer; the workflow pins 11.16.0
npm trust list stacktape
npm trust github stacktape --repo stacktape/stacktape --file release.yml --env release-publish --allow-publish
npm trust list stacktape
```

npm permits only one trusted publisher per package. If `npm trust list stacktape` shows the old release setup, first
replace it with `npm trust revoke stacktape --id <existing-id>`, then run the `npm trust github` command above.

Do not add `NPM_TOKEN`, AWS access keys, or `STACKTAPE_API_KEY` to the workflow.

## Other mutable publications

The old release also invoked the CLI to update schemas and generated AI documentation. Those endpoints remain separate
from v4 npm/binary releases for now; do not reintroduce a Stacktape API key into `release.yml` to publish them. When
they are reconnected, give their exact buckets/distributions the same direct-OIDC treatment.

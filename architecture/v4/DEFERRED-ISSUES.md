# Deferred issues

Known problems discovered during the simplified v4 migration that are deliberately not expanding the current
refactoring scope. Revisit them before the v4 release where marked.

## Release blockers

- **Regenerate the committed `aws:call` LLM documentation.** The source documentation and generator have not migrated
  into `apps/docs` yet. The committed generated page still describes the removed `Batch*` prefix rule and incorrectly
  presents `aws:call` as stack-independent. Do not hand-edit generated output; migrate its source and restore a
  freshness check before publishing v4.
- **Audit old plaintext development credentials.** The retired
  `C:\Projects\console-app\AGENTS_DEV_PLAYBOOK.md` contains live-looking credential material. None was copied into this
  repository. Rotate or invalidate those credentials before treating the old repositories or backups as safe.

## Later security hardening

- Dockerfile commands and application processes can print their own build arguments or environment values. Stacktape
  now keeps configured values out of Docker argv and its own command/error strings, but it cannot make deliberately
  printed child output secret.
- Docker CLI child-environment values remain visible to the same operating-system user and to root/Administrator.
  This is narrower than argv exposure, not a hardware-backed secret boundary.
- `isDockerNotRunningError` can classify a registry-side `connection refused` as “Docker is not running.” Fix this
  only with characterization against real daemon and registry failures.
- The semi-local dev agent's `POST /aws/sdk` endpoint is intentionally mutation-capable and uses the dev-agent role.
  Review its authentication, confirmation, and least-privilege model as part of the later dev-agent/AWS-manager
  hardening, not during package extraction.
- Review credential/key rotation and versioning for the Console security-hardening work before a production rollout.
- AWS SDK debug middleware serializes most operation inputs and only redacts a small set of body/log fields. Secret
  Manager values, SSM values, and CodeBuild environment variables need a centralized field-aware redaction policy.
- The CLI's override-region CloudFormation and SSM clients do not attach the manager's configured middleware. Revisit
  whether retry, redirect, diagnostics, and redaction behavior must be identical to the normal client path.
- Console connected-account credential construction currently asserts optional STS response fields into a complete
  credential object. Validate the response explicitly before constructing an initialized AWS manager.
- Long-running Console operations retain one assumed-role credential set without refresh, while the CLI's timer-based
  refresh has no owning await/catch path. Define explicit refresh and failure ownership when the AWS manager is
  refactored.

## Known v3 behavior debt

- Minimal-template cleanup removes an AWS CDK construct from the wrong object level. The current code deletes
  `cleanedConfig[key]` instead of `cleanedConfig.resources[key]`; fix it with a dedicated server-mode
  characterization test.
- The default merge's special `container` fallback assigns the merged value to a `forEach` parameter rather than the
  array. No current resource default reaches that branch, so it remains unchanged while the defaulting contract is
  typed.
- Defaulting starts with a shallow resource copy. When an authored nested bag exists, filling its missing leaves can
  therefore write back into the working resolved-config object. Raw authored configuration is protected by an earlier
  serialization clone, but changing this behavior needs its own compatibility decision and tests.
- CDN route rewriting can dereference `routeRewrite.routeTo` in the branch specifically handling an absent `routeTo`.
  An omitted target is supported and means “reuse the resource's default origin,” so characterize and fix this crash
  separately from the CDN-present type-contract slice.
- A second permanent-credential load can use an unassigned local `creds` value when the existing source is a
  credentials file, or environment variables without expiration. Strict mode already identifies the unsafe branch in
  `GlobalStateManager.loadValidatedAwsCredentials`.
- Automatic re-assume requests the AWS manager's default 12-hour session even when the CodeBuild role it refreshes
  allows only ten hours. The same duration expression also raises every explicit duration at or below one hour to
  exactly one hour, rather than preserving shorter valid requests.
- AWS-manager operations are not uniformly guarded before `init()`. Every traced real producer initializes first, but
  accidental pre-init use can fail incidentally or allow AWS SDK fallback resolution; a fail-fast state contract needs
  an explicit compatibility decision.

## Operational note from the smoke test

The first packaging-smoke attempt reached ECR authentication before failing because Docker was unavailable in the WSL
PATH. Its error exposed a short-lived ECR authorization token through the old `docker login -p` command line. The
captured local log was deleted, the token was temporary, and commit `352dd8dd` changed login to `--password-stdin`.
No CloudFormation stack was created by that attempt.

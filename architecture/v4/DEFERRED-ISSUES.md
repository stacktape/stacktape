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

## Operational note from the smoke test

The first packaging-smoke attempt reached ECR authentication before failing because Docker was unavailable in the WSL
PATH. Its error exposed a short-lived ECR authorization token through the old `docker login -p` command line. The
captured local log was deleted, the token was temporary, and commit `352dd8dd` changed login to `--password-stdin`.
No CloudFormation stack was created by that attempt.

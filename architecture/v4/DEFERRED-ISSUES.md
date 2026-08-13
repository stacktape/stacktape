# Deferred issues

Known problems discovered during the simplified v4 migration that are deliberately not expanding the current refactoring
scope. Revisit them before the v4 release where marked.

## Release blockers

- **Audit old plaintext development credentials.** The retired `C:\Projects\console-app\AGENTS_DEV_PLAYBOOK.md` contains
  live-looking credential material. None was copied into this repository. Rotate or invalidate those credentials before
  treating the old repositories or backups as safe.

## Later security hardening

- Dockerfile commands and application processes can print their own build arguments or environment values. Stacktape now
  keeps configured values out of Docker argv and its own command/error strings, but it cannot make deliberately printed
  child output secret.
- Docker CLI child-environment values remain visible to the same operating-system user and to root/Administrator. This
  is narrower than argv exposure, not a hardware-backed secret boundary.
- The semi-local dev agent's `POST /aws/sdk` endpoint is intentionally mutation-capable and uses the dev-agent role.
  Review its authentication, confirmation, and least-privilege model as part of the later dev-agent/AWS-manager
  hardening, not during package extraction.
- Review credential/key rotation and versioning for the Console security-hardening work before a production rollout.
- Console browser credentials are now narrowed to a server-owned capability and AWS action list, but direct AWS
  credentials are still an organization/account boundary rather than a project boundary. A project-scoped member can
  reuse issued credentials against resources from another project in the same connected account when the AWS API cannot
  be resource-scoped (for example, CloudWatch `GetMetricData`). Do not treat a client-supplied project ID as a fix.
  Enforcing project isolation requires server-proxied operations with server-verified resource context, narrowly scoped
  per-stack roles, or presigned resource operations. Organization-wide Secrets Manager, Parameter Store and domain
  access also need an explicit product decision before that redesign.
- Console reads and writes of customer-managed KMS-encrypted Secrets Manager secrets and secure SSM parameters may
  require additional key-specific KMS actions. The previous managed browser policies did not grant these actions either.
  Add them only alongside a server-verified key/resource boundary rather than widening every browser session.

## Operational note from the smoke test

The first packaging-smoke attempt reached ECR authentication before failing because Docker was unavailable in the WSL
PATH. Its error exposed a short-lived ECR authorization token through the old `docker login -p` command line. The
captured local log was deleted, the token was temporary, and commit `352dd8dd` changed login to `--password-stdin`. No
CloudFormation stack was created by that attempt.

After Docker access was repaired, public commit `f091e541` passed the complete disposable smoke flow on 2026-07-30:
deploy, both live function invocations, identical source/runtime fingerprints, one identical versioned Lambda layer
attached to both functions, cached no-change redeploy, deletion, and an absent-stack confirmation. The temporary project
used a unique name and no smoke stack remains deployed.

# Live AWS testing

Follow the [test-selection policy](../testing.md); use this procedure only when the assertion depends on AWS. For shared
Console dev work, also follow the [reservation procedure](console.md#shared-dev-reservation).

Agents may run development AWS operations without asking again: they may deploy unique disposable stacks, deploy
`console-app-dev`, refresh `console-app-devlocal`, and build test AMIs without asking for each run. This authorization
never includes production.

Every live scenario must enforce these rules in code:

1. Resolve the active AWS account and region before mutation and compare the account with an explicit expected ID.
2. Use a unique project/stage or resource name and ownership tags. Never discover cleanup targets from a broad prefix.
3. Write recovery state before or immediately after creating each resource.
4. Once resource creation has been attempted, clean up in `finally` after success and failure, then query AWS to verify
   that owned resources are gone. A rejected account, name, or ownership preflight must never authorize cleanup.
5. If cleanup is interrupted, preserve the state file and print one exact `--cleanup-only` command. Run cleanup before
   starting another scenario.
6. Keep credentials and parameter values out of commands, logs, reports, and Git.

Prefer low-cost Lambda, S3, DynamoDB, SQS, and log-group scenarios. Provision NAT gateways, load balancers, RDS,
OpenSearch, large EC2 instances, or long-running fleets only when that resource is the behavior under test. Keep them
for the shortest practical time and never leave an idle runner. AMI scenarios must deregister obsolete test images and
delete their owned snapshots after verification.

Run existing guarded scenarios through:

```sh
pnpm test:aws --aws-scenario=<name>
```

The required disposable-account confirmation, exact account ID, credential selection, unique name, state, and recovery
contract are documented in [`../../apps/cli/scripts/real-aws/README.md`](../../apps/cli/scripts/real-aws/README.md).

The packaging and init canaries require a genuinely disposable account. Permission to create uniquely owned test
resources in the shared Console hosting account does not make that account disposable. Use a separate test account or
first qualify an explicitly scoped shared-account runner; never bypass the canary's account acknowledgement.

Before changing a shared Console support stack, inspect its existing resources. Removing legacy data is a migration
decision, not routine cleanup. Existing dev authorization covers ordinary development operations; a newly discovered
destructive effect on unrelated shared data needs a concrete explanation and approval.

## Source CLI and local workload runtime

These two commands are easy to confuse:

- **Source-built CLI:** `pnpm dev:cli <command>` builds the current CLI source and then runs that command with
  `STP_DEV_MODE=true`. This automatically selects the dev Stacktape API and dev Cognito pool. The target deployment
  stage is still explicit, for example `--stage dev`.
- **Local workload runtime:** `pnpm dev:cli dev ...` invokes the Stacktape product's `dev` command. It starts selected
  workloads locally and may start emulators or use remote resources.

Never replace `pnpm dev:cli` with an installed `stacktape` binary when testing an unbuilt CLI change. Never infer the
deployment stage from source-CLI dev mode; spell out `--stage`, `--region`, `--projectName`, and the credential mode for
mutating commands.

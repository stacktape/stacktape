# Developing in this monorepo

How to run the checks, drive the CLI you just built, and validate a change against real AWS. Written for both humans
and agents; `AGENTS.md` still owns the architecture and review rules.

## Setup

- Node >= 24, pnpm 11.17 (`packageManager` pins it), Bun 1.3.9, Git.
- Docker only for the container/image buildpacks and the local database emulation of `dev` mode.
- `apps/console` is a private submodule. Its absence is normal; everything below works without it.

```powershell
pnpm install --frozen-lockfile
```

## Credentials

Nothing in this repository holds a credential, and nothing should start to.

- **Stacktape** — needed for deploys and commands that read or mutate Stacktape organization data. Set
  `STACKTAPE_API_KEY` in the environment, or log in once with the development CLI
  (`pnpm --filter @stacktape/cli run dev login`), which persists the session outside the repository. The local
  `package`, `synth`, and `validate` commands do not use this credential.
- **AWS** — the standard AWS credential chain. The two selection flags are not interchangeable:
  - `--profile <name>` selects a **local AWS profile** from your `~/.aws` configuration (the `aws-profile:*` commands
    manage these, and `defaults:configure` can set a default one);
  - `--awsAccount <name>` selects an **AWS account connected through Stacktape** — one that was linked in the
    Stacktape Console. It names nothing on your machine.

  With neither flag the CLI falls back to `AWS_PROFILE` and, for the region, `AWS_DEFAULT_REGION` — that variable, not
  `AWS_REGION`. Exporting `AWS_PROFILE` is also the way to keep a whole session on one profile: `--profile` is
  accepted by most commands but not all (`info:stack` has no such flag and rejects it).

The development CLI additionally loads `apps/cli/.env.local` on every run. That file is git-ignored and is the
intended home for a local `STACKTAPE_API_KEY`; keep real values only there or in your shell. Set `SKIP_LOADING_ENV=1`
to run without it.

`projectName` may be declared once at the top level of `stacktape.ts`/YAML. `--projectName` remains useful for
temporary stacks and overrides the configured value. In v4, the old top-level `serviceName` property no longer exists.

The pre-commit hook scans staged changes for credential patterns; `pnpm check:secrets` scans everything tracked.

## Local repository checks

These need no credentials and touch no cloud.

```powershell
pnpm check            # everything available in this checkout
pnpm check:public     # the subset that must pass without apps/console
pnpm fmt              # oxfmt + dprint; fmt:check in CI
pnpm lint
pnpm typecheck
pnpm test
```

Narrow the loop while you work:

```powershell
pnpm --filter @stacktape/cli run typecheck
pnpm --filter @stacktape/cli run test
pnpm --filter @stacktape/cli exec bun test tests/characterization
pnpm --filter @stacktape/packaging run test
```

`pnpm dev` at the root is `turbo run dev` — the Astro dev servers for `apps/docs` and `apps/website`. It is unrelated
to the Stacktape `dev` command described below.

## Building a release candidate

`.github/workflows/release.yml` is a manually dispatched, artifact-only workflow. It builds all six supported platform
archives, generates checksums for that exact archive set, embeds the manifest in a verified npm package, smoke-tests
the Alpine archive/runtime, and uploads one inspectable candidate artifact. It cannot publish npm packages, create a
GitHub release, push a tag, or deploy anything.

```powershell
gh workflow run release.yml --ref v4/integration -f version=4.0.0-beta.1
gh run watch <run-id>
gh run download <run-id>
```

Use a unique prerelease version for each inspection. Publishing and default-branch cutover require a separately
reviewed protected stage and explicit approval.

## The development CLI

`pnpm --filter @stacktape/cli run dev <command> [options]` builds the CLI from source with Bun and runs it in one
step. This is the binary under test; the published `stacktape` package is not.

```powershell
pnpm --filter @stacktape/cli run dev version
pnpm --filter @stacktape/cli run dev help
pnpm --filter @stacktape/cli run dev info:whoami
```

Local project checks use only the selected AWS profile and do not contact the Stacktape Console:

```powershell
pnpm --filter @stacktape/cli run dev package --configPath <config> --stage dev --region eu-west-1 --profile <profile>
pnpm --filter @stacktape/cli run dev synth --configPath <config> --stage dev --region eu-west-1 --profile <profile>
pnpm --filter @stacktape/cli run dev validate --withPackage --configPath <config> --stage dev --region eu-west-1 --profile <profile>
```

These commands still resolve the AWS account identity because account ID and region are part of Stacktape's stable
resource names. `synth` and `validate` also read AWS metadata needed to produce the same account-specific template a
deploy would use; they are Console-independent, not AWS-free.

Notes that save time:

- The wrapper's working directory is `apps/cli`, so `--configPath` is resolved from there.
- Every run repackages the four helper Lambdas. `SPHL=1` skips that once they exist, which is much faster.
- `--agent` switches the CLI to JSONL output and auto-confirms operations. Use it when a script or an agent parses
  the output; use plain mode when a human reads it.
- Scratch output lands in `.stacktape/` next to the config file, and stack outputs in `.stacktape-stack-info/`. Both
  are git-ignored.

**Platform constraint.** On Windows, Bun 1.3.9's bundler panics on modules reached through pnpm's symlinked
`node_modules` ("Expected pretty file path to have only forward slashes"), which takes down the helper-Lambda
packaging step and therefore the whole `dev` wrapper. Run the development CLI, complete `pnpm check`/`check:public`,
and every Bun-bundling test lane on Linux, macOS, or WSL. Typecheck, lint, formatting, and the focused non-bundling
tests run on Windows; see `apps/cli/AGENTS.md` for the exact list of bundling lanes.

**Using WSL from a Windows machine.** Do not point WSL at the Windows checkout under `/mnt/c`. `pnpm install` on
Windows resolves Windows builds of the workspace's native dependencies, and reusing that `node_modules` from Linux
gives you binaries for the wrong platform — plus `/mnt/c` file-watching and permissions problems. Instead, clone (or
create the worktree) on the WSL filesystem and install there:

```sh
# inside WSL, on the Linux filesystem — not /mnt/c
git clone --branch v4/integration <repository-url> ~/src/stacktape
cd ~/src/stacktape
pnpm install --frozen-lockfile
```

The branch flag is needed only until v4 becomes the repository default. The two checkouts are independent: install in
each, and let Git — not the filesystem — move changes between them.

## Semi-local development mode

`dev` runs selected workloads on your machine against a stack. It is still supported and has two modes:

- default — deploys a minimal dev stack (IAM roles, secrets) and emulates databases and Redis locally in Docker;
- `--devMode legacy` — requires an already deployed stack and connects local workloads to its real AWS resources.

```powershell
pnpm --filter @stacktape/cli run dev dev --projectName <project> --stage dev --region eu-west-1 --resources <name> --agent
```

With `--agent` (or `--agentPort`) the CLI starts a small HTTP control server on the first free port from 7331 and
prints the one it took:

- `GET /status` — readiness;
- `GET /env/{workload}` — the environment variables that were resolved and injected;
- `POST /rebuild/{workload}` or `/rebuild/all` — rebuild without restarting.

Stop it with `pnpm --filter @stacktape/cli run dev dev:stop --agentPort <port>`, and add `--cleanupContainers` to
remove containers a crashed session left behind. Resolved secrets are cached for the session: restart after changing
one.

## Real-AWS validation

Deploying is the only way to prove packaging, synthesis and IAM scoping. It is also the only lane here that spends
money and can destroy something.

**Guardrails — all of them, every time.**

1. Confirm who you are and where you are pointing _before_ the first mutating command.

   With a local AWS profile, use the raw AWS CLI and then list stacks through the same profile:

   ```powershell
   aws sts get-caller-identity --region eu-west-1 --profile '<profile>'
   pnpm --filter @stacktape/cli run dev info:stacks --region eu-west-1 --profile '<profile>'
   ```

   Drop `--profile` only when you are deliberately using the default profile. Read the account id back and confirm it
   is a disposable development account.

   Alternatively, with a Stacktape-connected account, there is no corresponding local profile. Inspect the
   authenticated identity and connected account id, then force that account on the stack listing:

   ```sh
   pnpm --filter @stacktape/cli run dev info:whoami --agent
   pnpm --filter @stacktape/cli run dev info:stacks --region eu-west-1 --awsAccount '<connected-account>' --agent
   ```

   In the `info:whoami` result, find the connected-account entry whose `name` exactly matches the value passed to
   `--awsAccount`; confirm that entry is `ACTIVE` and its `awsAccountId` is the expected disposable development
   account. The second command then loads temporary credentials and validates them against that selected account before
   listing stacks. Do not use `aws:call` as the initial identity check: it requires a deployed target stack and may
   assume that stack's debug role.

2. Use a uniquely named throwaway stack and stage `dev`. Never reuse a name that already appears in `info:stacks`.
3. Never target a production or Console stack, and never run a stack-targeted command — mutating or not — without
   `--projectName` and `--stage` spelled out. An omitted flag falls back to a configured default, which is how the
   wrong stack gets hit, and a read-only command that resolves the wrong stack still assumes that stack's debug role.
4. Deployment needs explicit authorization. Agents: do not deploy, and do not run costed AWS tests, unless the task
   says so.
5. Delete the stack when finished, including after a failure, and confirm with `info:stacks`.

The reusable fixture for this is `apps/cli/_test-stacks/packaging-smoke/` — two Node Lambdas sharing one module behind
public function URLs. Give every run a unique project name, use stage `dev` and region `eu-west-1`, and follow its
[README](apps/cli/_test-stacks/packaging-smoke/README.md) for the exact deploy, invoke, redeploy, inspect, and delete
flow.

Useful read-only commands against a deployed stack:

```powershell
pnpm --filter @stacktape/cli run dev info:stack --projectName <project> --stage dev --region eu-west-1
pnpm --filter @stacktape/cli run dev param:get --projectName <project> --stage dev --region eu-west-1 --resourceName <resource> --paramName url
pnpm --filter @stacktape/cli run dev logs --projectName <project> --stage dev --region eu-west-1 --resourceName <resource> --startTime 30m
pnpm --filter @stacktape/cli run dev aws:call --projectName <project> --stage dev --region eu-west-1 --service cloudformation --command DescribeStacks --input '{"StackName": "<project>-dev"}'
pnpm --filter @stacktape/cli run dev query:sql --projectName <project> --stage dev --region eu-west-1 --resourceName <db> --sql "SELECT 1"
```

Every line above spells out the target — `--projectName` and `--stage` — including the read-only ones, so a persisted
default cannot silently point a command at another stack (and, for `aws:call`, at another stack's debug role).

`aws:call` sends only service/operation pairs from an explicit allowlist in
`apps/cli/src/domain/debug-services/aws-read-only-operations.ts`: each supported service names the operations reviewed
as read-only _for that service_, and anything else — unknown service, unlisted operation, right operation on the wrong
service — is rejected. There is no "every `Get*` is safe" rule, because that is not true: Step Functions
`GetActivityTask` claims a task and starts its timeout, and SQS `ReceiveMessage` hides messages from the real consumer.
Coverage is deliberately partial, so expect to hit a genuinely read-only operation that nobody has reviewed yet; adding
it means auditing it and extending that file, and a rejection lists what the service does accept. Understand what the
guard is: a check on the name, nothing more. The command prefers the stack's debug role but falls back to your own AWS
credentials when the stack has no such role or it cannot be assumed, so an accepted operation runs with whatever your
credentials allow. `query:sql`, `query:dynamodb`, `query:redis` and `query:opensearch` similarly restrict themselves
to read operations. Add `--bastionResource <bastion>` to `query:sql` when the database is reachable only from inside
the VPC.

The flip side is that the debug role can be _narrower_ than your credentials: an `aws:call` that the guard accepts can
still come back `AccessDenied`. When you need an answer about deployed AWS state rather than a test of the CLI, the
raw AWS CLI is often the shorter path — see the fixture README for the layer check it needs.

And a caveat worth knowing before the first deploy: when Stacktape packages a project that lives inside this
repository, its dependency installer walks up to the workspace root and may run `pnpm install` there. Have a clean
working tree, and check `git status` afterwards.

## Cross-platform notes

The Stacktape and pnpm commands above are one-liners that paste unchanged into PowerShell and POSIX shells. Only the
environment-variable syntax differs — `$env:SPHL = '1'` versus `SPHL=1 <command>` — and, as noted, the development CLI
itself needs Linux, macOS or a WSL-native checkout. The multi-line AWS CLI recipes in the fixture README are the one
exception: they are given in both PowerShell and POSIX form, because the line-continuation character is not shared.

# Development

## Setup and checks

Install Node 24+, pnpm 11.17 and Bun 1.3.14. Docker is needed only for packaging tests and local database emulation. The
private `apps/console` submodule is optional for public work.

```sh
pnpm install --frozen-lockfile
pnpm check:public
pnpm check:integrated   # requires apps/console
pnpm fmt
pnpm lint
pnpm typecheck
pnpm test
```

Use package filters during development, for example `pnpm --filter @stacktape/cli run typecheck`. Run
`pnpm test:packaging-e2e` before a packaging-sensitive release; it needs Docker and downloads pinned build inputs, but
does not contact AWS.

## Run an application

There is no root `dev` command because the applications do not form one useful process.

```sh
pnpm dev:cli version    # build and run one CLI command from source
pnpm dev:console       # Console API and UI through Stacktape dev mode
pnpm dev:console:ui    # UI only at http://localhost:4000, using the deployed dev API
pnpm dev:docs           # documentation at http://localhost:9001
pnpm dev:website
pnpm dev:vscode-extension # rebuild the VS Code extension on changes
pnpm dev:wizard-ui      # rebuild the init wizard on changes
```

`dev:cli` asks Turbo to materialize the helper Lambdas and init UI before Bun runs the command. Turbo reuses those
outputs until their inputs change. The command runs with `apps/cli` as its working directory, so relative config paths
start there.

For extension work, run `pnpm dev:vscode-extension`, then launch an Extension Development Host from VS Code with
`apps/vscode-extension` as the extension development path. `pnpm --filter vscode-stacktape test` exercises the bundled
language server over LSP; `pnpm package:vscode-extension` creates an installable VSIX.

Use `pnpm dev:console:ui` for UI work against the deployed dev API. Use `pnpm dev:console` for API work or an API/UI
change: it runs both locally, connects the API to the shared dev database and services, and leaves the deployed dev
Lambdas handling external webhooks and background work. The command maintains the `console-app-devlocal` support stack
and therefore needs the credentials described in `apps/console/README.md`.

Console deployments also use the source-built workspace CLI:

```sh
pnpm deploy:console:dev # deploy console-app-dev
pnpm deploy:console     # deploy console-app-production
```

Both commands can change real AWS resources. The production command explicitly selects the `stacktape-dev` account.

## Credentials and local state

Run `pnpm dev:cli login` for a human Stacktape session. Use `STACKTAPE_API_KEY` only for automation that cannot log in.
The local `package`, `synth`, and `validate` commands do not need Console authentication.

AWS uses the standard credential chain:

- `--profile <name>` selects a local AWS profile;
- `--awsAccount <name>` selects an account connected through Stacktape Console;
- without either, the CLI uses `AWS_PROFILE` and `AWS_DEFAULT_REGION` when present.

The development CLI still reads `apps/cli/.env.local`, but it is not the preferred credential store. Use an external
login session or short-lived environment variables. [`secrets.md`](secrets.md) defines the repository policy.

Stacktape writes project scratch data to `.stacktape/` and stack outputs to `.stacktape-stack-info/`. Both are ignored.
The full local-state ownership map lives in `apps/cli/src/config/local-state-paths.ts`.

## Local packaging and synthesis

These commands exercise the source-built CLI. They resolve AWS identity and metadata because account and region affect
stable names, but they do not use the Stacktape Console.

```sh
pnpm dev:cli package --configPath <config> --stage dev --region eu-west-1 --profile <profile>
pnpm dev:cli synth --configPath <config> --stage dev --region eu-west-1 --profile <profile>
pnpm dev:cli validate --withPackage --configPath <config> --stage dev --region eu-west-1 --profile <profile>
```

`pnpm dev:cli dev ...` runs selected workloads locally and may emulate databases or Redis in Docker. Add
`--remoteResources` only when you intentionally want a local workload to use deployed resources. Agent mode exposes a
loopback control API; `dev:stop` closes it and can clean containers left by a crashed session.

## Worktrees and Console

Let Codex or Claude Code create worktrees. Public-only tasks can leave `apps/console` uninitialized. A Console task
initializes the submodule and creates a private branch inside it:

```sh
git submodule update --init apps/console
git -C apps/console switch -c <private-feature-branch>
```

Push the private commit before committing the public pointer, then run `pnpm console:pointer:verify`. A public worktree
cannot make an unpublished private submodule commit recoverable.

On Windows, do not reuse the Windows checkout from WSL through `/mnt/c`; native dependencies will target the wrong
platform. Clone or create a separate worktree on the WSL filesystem and install there.

## Real AWS and releases

Real deployments are explicit, costed validation. Use a unique project, spell out project and stage on every command,
verify the exact account first, and delete the stack after success or failure. The guarded packaging and init canaries,
including their required environment variables and recovery behavior, live in
[`apps/cli/scripts/real-aws/README.md`](../apps/cli/scripts/real-aws/README.md). The smaller manual fixture is
[`apps/cli/_test-stacks/packaging-smoke`](../apps/cli/_test-stacks/packaging-smoke/README.md).

Preview and stable releases use the same workflow and artifact checks. See [`releasing.md`](releasing.md).

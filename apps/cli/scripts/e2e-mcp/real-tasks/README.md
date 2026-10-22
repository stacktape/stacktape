# MCP real-task suite

Measures whether coding agents get real work done with the Stacktape MCP server: debugging a production error,
inspecting data, changing the configuration and shipping a fix. It runs Claude Code or Codex against a deployed project
the way a developer would ask, without telling the agent to use Stacktape, and records which tools the agent picked,
which Stacktape calls were wasted, and whether the task got done.

In the default `crowded` setup the agent also has the MCP servers developers commonly install (GitHub, AWS API, AWS
CloudWatch, AWS Knowledge, Context7, Playwright, Sentry). They are replayed from recorded tool lists (`../catalogs`,
refreshed with `bun scripts/e2e-mcp/capture-catalogs.ts`), so Stacktape's tools compete with the same names and
descriptions; their calls are logged and refused.

## Setup

The project is [`_test-stacks/mcp-shop-api`](../../../_test-stacks/mcp-shop-api): Hono on Lambda with DynamoDB and a
planted bug. It is deployed with the source CLI into the disposable `stacktape-e2e` connection (account `597581086285`,
`eu-west-1`), which needs the dev API key in `apps/cli/.env.local`.

```sh
bash scripts/e2e-mcp/real-tasks/prepare.sh   # bench folder: ~/.cache/stacktape-mcp-bench
bash scripts/e2e-mcp/real-tasks/stack.sh deploy
bash scripts/e2e-mcp/real-tasks/stack.sh seed
```

`stack.sh` checks the account before every change. Agents run with local AWS credentials hidden, and the `stacktape` on
their PATH is [`bin/stacktape`](bin/stacktape), which logs shell use and runs the source CLI.

## Run

From `apps/cli`:

```sh
bun scripts/e2e-mcp/run-real-tasks.ts                                    # Claude Code (sonnet), crowded
RT_CLIENT=codex bun scripts/e2e-mcp/run-real-tasks.ts                    # Codex with its configured model
RT_ONLY=debug-500,order-data RT_REPEAT=3 bun scripts/e2e-mcp/run-real-tasks.ts
```

Other options: `RT_SETUP=alone` (Stacktape only), `RT_MODEL`, `RT_CONCURRENCY` (default 3), `RT_TIMEOUT_MS`. The
`fix-and-ship` task deploys to the stack and runs after the others, followed by a redeploy of the original project.
Results go to `~/.cache/stacktape-mcp-bench/runs/<time>-<client>-<setup>/` (`summary.md`, plus the prompt, events and
tool calls of every run).

## Clean up

```sh
bash scripts/e2e-mcp/real-tasks/stack.sh delete
```

The `secret` task stores a test secret in `stacktape-e2e` (`eu-west-1`) under a name the agent chooses. Delete those
with `secret:delete` after a run. Each fresh deploy also leaves a `shop-api` project record in the dev organization.

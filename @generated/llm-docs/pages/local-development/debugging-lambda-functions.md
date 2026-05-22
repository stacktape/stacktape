# Debugging Lambda Functions

Stacktape [dev mode](/local-development/dev-mode-overview) runs Lambda functions on real AWS infrastructure while you iterate on code locally. Functions execute with real IAM permissions, event sources, and service integrations. The dev TUI streams logs and supports on-demand rebuilds — giving you a fast edit-test loop without running a full stack deployment.

## How dev mode runs Lambda functions

Lambda functions in Stacktape dev mode are deployed to AWS Lambda and execute in their real cloud environment. Unlike [container workloads](/local-development/debugging-containers) that run locally in Docker, Lambda functions use their actual runtime, memory limits, timeout constraints, and network configuration. This surfaces issues that local emulation would miss — permission errors, cold start behavior, timeout failures, and integration problems all appear during development, not after you ship.

When you first start dev mode for a stage, Stacktape deploys a lightweight dev stack containing only the infrastructure your selected resources need. Subsequent runs reuse the existing dev stack, making startup faster. The dev TUI then launches with log streaming, keyboard controls for rebuilding functions, and status for any [local databases](/local-development/local-databases) you selected.


## Flow
1. **Load config**: Stacktape reads your configuration and discovers dev-compatible resources (functions, containers, databases)
2. **Select resources**: Choose which resources to run via the interactive picker or --resources / --skipResources flags
3. **Deploy dev stack**: A minimal dev stack is deployed automatically on first run (normal mode only)
4. **Start local databases**: Selected databases run as Docker containers on your machine
5. **Set up tunnels and environment**: TCP tunnels connect deployed Lambda functions to local databases; environment variables are injected
6. **Run workloads and stream logs**: Functions are deployed, logs stream into the dev TUI, and you can rebuild on demand


## Starting dev mode

Run [`stacktape dev`](/cli/dev) to start dev mode. Lambda functions appear as selectable resources in the interactive picker, or you can specify them directly with CLI flags.

Run all dev-compatible resources in your config:

```bash
stacktape dev --stage dev --resources all
```

Run only specific Lambda functions by name (comma-separated):

```bash
stacktape dev --stage dev --resources myApi,myWorker
```

Run everything except specific resources:

```bash
stacktape dev --stage dev --skipResources heavyBatchJob
```

Without `--resources` or `--skipResources`, Stacktape displays an interactive multi-select picker listing all dev-compatible resources. All resources are pre-selected by default — deselect any you don't need and confirm to start.


> **Info:** If you specify a resource name that doesn't exist in your config, Stacktape suggests similar names using fuzzy matching. The `--resources` and `--skipResources` flags accept comma-separated values.


Here is a minimal config with a [Lambda function](/resources/compute/lambda-function). This function is dev-compatible and will appear in the resource picker when you run `stacktape dev`:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: 512,
    timeout: 30
  });

  return {
    resources: { api }
  };
});
```


### First-time setup

The first run deploys a dev stack, which takes longer than subsequent runs. If the target stage already has a non-dev stack (from a prior [`stacktape deploy`](/cli/deploy)), dev mode refuses to overwrite it and asks you to use a different stage name.

Use a dedicated stage name for dev mode — `dev`, `dev-local`, or a personal stage like `dev-jane`. Alternatively, use `--devMode legacy` to run dev mode against an existing deployed stack (see [Normal vs legacy dev mode](#normal-vs-legacy-dev-mode) below).


> **Warning:** Normal dev mode and full deployments share the same stage namespace. Running `stacktape dev --stage production` when `production` is already deployed will fail. Always use a separate stage name for dev mode.


If your config includes `beforeDev` [hooks](/configuration/hooks-and-scripts), they run automatically during dev mode startup before workloads begin.

## Rebuilding functions in the dev TUI

After changing your function code, trigger a rebuild from the dev TUI. Stacktape re-packages and redeploys the function without restarting the entire dev session.

Rebuild all running workloads by typing `rs` and pressing Enter:

```
rs
```

Rebuild a specific function by name:

```
rs myApi
```

If the workload name doesn't match any running resource, the dev TUI prints a warning. This helps catch typos — use the exact resource name from your config.

The dev TUI supports these keyboard commands:

| Command | Action |
|---------|--------|
| `rs` | Rebuild all workloads |
| `rs <name>` | Rebuild a specific workload by name |
| `c` or `clear` | Clear the log output |
| `q` or `quit` | Stop dev mode and exit |


> **Tip:** When iterating on a single function, use `rs <functionName>` instead of `rs` to skip rebuilding other workloads. This keeps the feedback loop tight when you're focused on one function.


## Viewing logs

### Dev TUI log streaming

The Stacktape dev TUI streams logs from running Lambda functions as they execute, giving you immediate feedback on each invocation. Logs appear within the TUI alongside status information for all running workloads and local resources. This is the primary debugging interface during active development — you see function output, errors, and stack traces without leaving your terminal.


> **Tip:** Structure your Lambda function output as JSON objects. JSON logs are easier to search and filter — both in the dev TUI during development and later with [`stacktape debug:logs`](/cli/debug-logs) and CloudWatch Logs Insights when investigating production issues.


### Historical logs with debug:logs

Outside of dev mode, use [`stacktape debug:logs`](/cli/debug-logs) to fetch CloudWatch logs from any deployed Lambda function. This command works against any deployed stage — production, staging, or a dev stage.

View logs for a specific function:

```bash
stacktape debug:logs --resourceName myApi --stage production
```

By default, `stacktape debug:logs` uses a one-hour start time and returns up to 100 events.

View the last 30 minutes of logs:

```bash
stacktape debug:logs --resourceName myApi --stage production --startTime 30m
```

Filter logs containing a specific pattern:

```bash
stacktape debug:logs --resourceName myApi --stage production --filter "ERROR"
```

Run a CloudWatch Logs Insights query for structured searching:

```bash
stacktape debug:logs --resourceName myApi --stage production --query "fields @timestamp, @message | filter @message like /error/ | sort @timestamp desc | limit 20"
```

The `--startTime` flag accepts relative values (`1h`, `30m`, `1d`, `5s`) and absolute ISO timestamps. Use `--limit` to control how many log events are returned. Add `--endTime` for an absolute end boundary, or `--raw` for machine-readable JSON output.


> **Warning:** CloudWatch Logs Insights queries (via `--query`) are billed by the amount of data scanned. For high-volume functions, use narrow time ranges and specific filters to control cost.


## Connecting to local databases

When you run [databases locally](/local-development/local-databases) in dev mode (Postgres, MySQL, Redis, DynamoDB, OpenSearch), Lambda functions deployed on AWS cannot directly reach `localhost` on your machine. Stacktape solves this with TCP tunnels that make local database ports reachable from the deployed Lambda functions.

When selected local databases exist and the `--noTunnel` flag is not set, dev mode runs additional setup steps during startup:

1. **Lambda tunnels** — TCP tunnels are created for each local database, exposing them through publicly reachable endpoints
2. **Injecting environment** — Lambda function environment variables are updated to point at the tunnel endpoints instead of the original database addresses

The "Injecting environment" step runs whenever local databases are selected, even if tunnels are disabled. This ensures Lambda functions receive the correct connection configuration for the active dev session.

Your function code uses the same environment variable names (like `STP_DB_CONNECTION_STRING`) regardless of whether the database is running locally or on AWS — the environment injection handles the routing transparently.

### Disabling tunnels

If tunnels cause issues (corporate firewall restrictions, network policy, or other connectivity problems), disable them:

```bash
stacktape dev --stage dev --noTunnel
```

With tunnels disabled, Lambda functions use whatever connection strings were configured at deploy time. To point functions at deployed AWS databases instead of local ones, mark those database resources as remote in your config with `dev.remote: true`. See [local databases](/local-development/local-databases) for configuration details.

## Normal vs legacy dev mode

Stacktape dev mode supports two modes, controlled by the `--devMode` flag. Normal mode is the default and the recommended choice for most development workflows.


## Feature Comparison

| Feature | Normal mode (default) | Legacy mode |
| --- | --- | --- |
| Dev stack | Deploys its own lightweight dev stack | Requires a pre-deployed stack |
| Local databases | yes | no |
| Tunnels to local databases | yes | Not applicable |
| First-run speed | Slower (deploys dev stack) | Immediate |
| Best for | Day-to-day development | Testing against full deployed stack |


**Normal mode** is the right choice for most development. It gives you an isolated environment with local database emulation, fast rebuilds, and no dependency on a previously deployed stack. The dev stack is minimal — it contains only what your selected resources need.

**Legacy mode** is useful when you need to test against your full deployed stack — for example, when debugging an issue that only reproduces with production data, or when your function depends on resources that dev mode doesn't emulate locally. Start legacy mode explicitly:

```bash
stacktape dev --stage staging --devMode legacy
```


> **Info:** Legacy mode requires that the specified stage has an existing deployed stack. If the stack doesn't exist, Stacktape shows an error suggesting you deploy first with `stacktape deploy` or switch to `--devMode normal`.


## Environment cleanup

When the dev mode process exits (via `Ctrl+C`, the `q` TUI command, or [`stacktape dev:stop`](/cli/dev-stop) for agent mode), Stacktape runs registered cleanup hooks. These hooks handle:

- **Stopping dev workloads** — running containers and function processes are shut down
- **Stopping local databases** — Docker containers for local databases are stopped
- **Closing tunnels** — active TCP tunnels are terminated
- **Restoring Lambda environment** — function environment variables modified during dev mode are cleaned up
- **Cleaning up credentials** — temporary credentials used during the dev session are removed

The dev TUI prints a summary of affected resources during cleanup, showing which workloads, local databases, and tunnels are being stopped.


> **Warning:** If dev mode exits unexpectedly (process kill, power loss, system crash), cleanup hooks may not run. In that case, redeploy the affected stage with [`stacktape deploy`](/cli/deploy) to reset Lambda environment variables to their deployed values.


## Agent mode

For AI-assisted debugging workflows, dev mode supports an `--agent` flag that starts a background daemon with an HTTP API. Coding assistants and AI agents can trigger rebuilds, read logs, and inspect workload state programmatically through this API.

```bash
stacktape dev --stage dev --agent
```

The agent daemon runs on port 7331 by default. Specify a different port with `--agentPort`. Stop a running agent with [`stacktape dev:stop`](/cli/dev-stop):

```bash
stacktape dev:stop --agentPort 7331
```

The agent exposes workload status (name, type, status, URL, port), local resource state, and log output. It can also trigger rebuilds of individual workloads or all workloads at once.

For a complete guide to agent mode — including API endpoints, integration with coding assistants, and common workflows — see [agent mode in dev](/using-with-ai/agent-mode-in-dev).

## Debugging strategies

### Structured logging

Lambda functions in dev mode run on AWS, so traditional local debugger attachment (breakpoints, step-through) is not available. The tradeoff is high-fidelity testing against the real Lambda environment. Structured logging is the most effective debugging approach — add JSON log statements at key points in your function. The dev TUI streams them as the function executes, and you can query them later with [`stacktape debug:logs`](/cli/debug-logs).

```typescript
export const handler = async (event: any) => {
  console.info(JSON.stringify({
    action: 'request_received',
    path: event.path,
    method: event.httpMethod
  }));

  try {
    const result = await processRequest(event);
    console.info(JSON.stringify({
      action: 'request_processed',
      statusCode: result.statusCode
    }));
    return result;
  } catch (error) {
    console.error(JSON.stringify({
      action: 'request_failed',
      error: error.message,
      stack: error.stack
    }));
    throw error;
  }
};
```

Use descriptive `action` fields so you can later filter with `--filter "request_failed"` or query with `--query "fields @timestamp, @message | filter @message like /request_failed/"`.

### Testing HTTP-triggered functions

For Lambda functions with [HTTP API Gateway triggers](/configuration/triggers/http-triggers), invoke the function's endpoint directly with curl, a browser, or any HTTP client while watching logs stream in the dev TUI. The dev stack deploys real event source mappings, so the function's URL is live and routable. This gives you a realistic end-to-end test of the HTTP path, including API Gateway request transformation and response formatting.

### Narrowing the feedback loop

When debugging a specific function, use `--resources <name>` to start only that function in dev mode. This reduces startup time and log noise from other workloads. Combine with `rs <name>` in the TUI for targeted rebuilds. For functions that process events from [SQS queues](/configuration/triggers/sqs-events), [DynamoDB Streams](/configuration/triggers/dynamodb-streams), or [schedules](/configuration/triggers/schedule-triggers), the dev stack deploys real event source mappings — send test events through the actual queue or stream and watch the function process them in real time.

## Dev mode vs deployed-stack debugging

| Aspect | Dev mode (`stacktape dev`) | Deployed stack (`debug:logs`) |
|--------|---------------------------|-------------------------------|
| Log delivery | Streamed in the dev TUI | Historical fetch from CloudWatch |
| Code iteration | Rebuild from TUI with `rs` | Requires full [`stacktape deploy`](/cli/deploy) |
| Database access | Local databases via tunnels | AWS-deployed databases |
| Interaction model | Interactive TUI with keyboard commands | Single CLI command |
| Infrastructure | Lightweight dev stack | Full production stack |
| Local resources | Docker-based databases on your machine | Not applicable |
| Best for | Active development and rapid iteration | Investigating issues in deployed stages |

Use dev mode for active development — the rebuild-and-test loop from the TUI is significantly faster than deploying each change. Use [`stacktape debug:logs`](/cli/debug-logs) for investigating issues in deployed production or staging stacks where you need historical logs without disrupting the running environment. You can also view logs in the [Stacktape Console](/stacktape-console/console-overview).

## FAQ

### Can I set breakpoints in Lambda functions during dev mode?

No. Lambda functions in dev mode run on AWS Lambda infrastructure, not on your local machine, so a local debugger cannot be attached. The tradeoff is that you test against the real Lambda runtime with actual IAM permissions, event sources, and service integrations. Use structured logging and the dev TUI's log streaming for rapid feedback — add targeted `console.info(JSON.stringify(...))` statements at key points and use `rs <name>` to rebuild quickly after changes.

### How do I rebuild a function after changing code?

Type `rs` in the dev TUI and press Enter to rebuild all workloads, or `rs <functionName>` to rebuild a specific function. Stacktape re-packages and redeploys the function code. There is no file-watching flag — rebuilds are triggered manually from the TUI, giving you explicit control over when the rebuild happens. This avoids unnecessary deploys during multi-file edits.

### Do my Lambda function's event sources work in dev mode?

Yes. The dev stack deploys real AWS infrastructure, including event source mappings for HTTP API Gateway triggers, SQS triggers, schedule triggers, and other configured [event sources](/configuration/triggers/overview). Your Lambda function receives real events from these sources during dev mode. For HTTP-triggered functions, invoke the deployed endpoint URL directly. For queue-triggered functions, send messages to the deployed SQS queue and watch logs in the dev TUI.

### Can I debug only some functions while keeping others on the deployed stack?

Yes. Use `--resources myApi,myWorker` to select specific functions, or `--skipResources heavyBatchJob` to exclude some. Unselected functions are not affected — they remain on whatever version was last deployed to that stage. This is useful when you're iterating on one function and don't want to rebuild or disrupt others.

### What happens to Lambda environment variables when dev mode exits?

Dev mode registers cleanup hooks — including Lambda environment restoration — when it starts. On a clean exit via `Ctrl+C` or the `q` TUI command, these hooks run and restore modified environment variables. If the process exits unexpectedly and cleanup doesn't run, redeploy the stage with [`stacktape deploy`](/cli/deploy) to reset environment variables to their deployed values.

### What's the difference between normal and legacy dev mode?

Normal dev mode (the default) deploys its own lightweight dev stack and supports running databases locally in Docker with tunnel connectivity to deployed Lambda functions. Legacy dev mode (`--devMode legacy`) requires an already-deployed stack and does not support local database emulation. Use normal mode for day-to-day development; use legacy mode when you need to test against a full production-equivalent stack or an existing deployed stage.

### Should I use dev mode or full deploy to test Lambda functions?

Use dev mode for active development — the rebuild cycle from the TUI is much faster than running [`stacktape deploy`](/cli/deploy) for each code change. Use a full deploy when you need to test the complete infrastructure (all resources, production database, custom domains, CDN configurations) or when validating a release. Dev mode is for fast iteration; full deploy is for comprehensive validation.

### How much does running dev mode cost?

Dev mode deploys a minimal dev stack with only the resources your selected functions need. AWS Lambda charges apply for invocations during development, but the AWS Lambda free tier covers 1 million requests and 400,000 GB-seconds of compute per month — enough for most development workflows. Local databases run in Docker on your machine at zero AWS cost. The primary cost during dev mode comes from any deployed AWS resources in the dev stack, such as API Gateway endpoints.

### Can I use dev mode for container workloads too?

Yes. Container workloads ([web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service), [private services](/resources/compute/private-service), and [multi-container workloads](/resources/compute/multi-container-workload)) are dev-compatible and run locally in Docker during dev mode. Unlike Lambda functions (which deploy to AWS), containers execute on your machine. Hosting buckets with a `dev` configuration and SSR frontends ([Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), etc.) are also supported. See [debugging containers](/local-development/debugging-containers) for container-specific details.

### How do I view logs from a Lambda function that's already deployed?

Use [`stacktape debug:logs`](/cli/debug-logs) with `--resourceName` and `--stage` to fetch CloudWatch logs from any deployed stage. By default, it returns the last hour of logs (up to 100 events). Add `--filter "ERROR"` to narrow results, or use `--query` for CloudWatch Logs Insights queries that can search structured JSON fields across log streams. You can also view logs in the [Stacktape Console](/stacktape-console/console-overview).

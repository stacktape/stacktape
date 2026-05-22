# Dev Mode Overview

Stacktape dev mode ([`stacktape dev`](/cli/dev)) runs your workloads locally while connecting to cloud resources, giving you instant feedback without redeploying. Container workloads and emulated databases use Docker. Hosting buckets and supported SSR frontends run through local dev servers. [Lambda functions](/resources/compute/lambda-function) deploy to AWS with logs streamed to your terminal.

## How dev mode works

Dev mode splits your stack between your local machine and AWS. Container workloads run in Docker, frontends run through their framework dev servers, and locally-emulated databases run in Docker containers — while Lambda functions deploy directly to AWS. The first run of normal dev mode deploys a dev stack to your AWS account. Subsequent runs reuse the existing stack.

| Resource type | Where it runs | Mechanism |
|---|---|---|
| Container workloads ([web-service](/resources/compute/web-service), [worker-service](/resources/compute/worker-service), [private-service](/resources/compute/private-service), [multi-container-workload](/resources/compute/multi-container-workload)) | Local machine | Docker containers |
| [Lambda functions](/resources/compute/lambda-function) | AWS | Deployed to AWS; logs streamed to terminal |
| [Relational databases](/resources/databases/relational-database) (PostgreSQL, MySQL, MariaDB) | Local machine | Docker database containers |
| [Redis](/resources/databases/redis) | Local machine | Docker Redis container |
| [DynamoDB tables](/resources/databases/dynamodb) | Local machine | Amazon DynamoDB Local container |
| [OpenSearch](/resources/databases/opensearch) | Local machine | OpenSearch Docker container |
| [Hosting buckets](/resources/frontend/static-hosting) (with `dev` config) | Local machine | Custom dev command |
| SSR frontends ([Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), [Remix](/resources/frontend/remix)) | Local machine | Framework dev server |

Lambda functions deployed to AWS can reach locally-emulated databases through automatic tunneling. Stacktape creates network tunnels (using a bore-compatible TCP relay) when local database emulation is active, routing database traffic from Lambda executions back to Docker containers on your machine. Tunnels are not created when no databases are emulated locally, or when you disable them with `--noTunnel`.

### Startup flow

When you run `stacktape dev`, the following steps execute in order:

1. **Load credentials and configuration** — Stacktape reads your AWS credentials and config file.
2. **Select resources** — You choose which resources to run via the interactive picker, or Stacktape uses the `--resources` and `--skipResources` flags.
3. **Load AWS metadata** — Stacktape fetches stack information from AWS.
4. **Ensure secrets and SSM parameters** — Stacktape creates any missing secrets and SSM parameters required by your config.
5. **Deploy dev stack** — In normal mode, the dev stack deploys only on the first run. Later runs reuse the existing stack. In legacy mode, Stacktape verifies an existing deployment.
6. **Start local resources and workloads** — Docker containers start for selected databases, then container workloads, frontends, and Lambda deploys run in parallel.


> **Info:** After the first run, normal dev mode skips the dev stack deployment step. Stacktape still loads AWS metadata, prepares local resources, starts tunnels when needed, and starts or deploys the selected workloads.


## Running dev mode

Start dev mode with the [`stacktape dev`](/cli/dev) command:

```bash
stacktape dev --stage dev --region us-east-1
```

When you omit the `--resources` flag, Stacktape shows an interactive resource picker listing all dev-compatible workloads and emulatable databases. All resources are pre-selected by default — deselect any you don't need and press Enter.

### Run all resources

Skip the interactive picker and run every dev-compatible resource:

```bash
stacktape dev --stage dev --region us-east-1 --resources all
```

### Run specific resources

Run only named resources (comma-separated):

```bash
stacktape dev --stage dev --region us-east-1 --resources myApi,myWorker
```

### Exclude resources

Run all resources except specific ones. Use `--skipResources` alone to run everything except the excluded resources, or combine it with `--resources all`:

```bash
stacktape dev --stage dev --region us-east-1 --skipResources myDatabase
```


> **Tip:** If you misspell a resource name, Stacktape suggests the closest matches using fuzzy matching. The error message also lists all available resource names in your config.


### Watch mode

Auto-rebuild workloads when source files change:

```bash
stacktape dev --stage dev --region us-east-1 --resources all --watch
```

Without `--watch`, you trigger rebuilds manually from the dev mode terminal using the `rs` command (see [Rebuilding workloads](#rebuilding-workloads)).

### Disabling tunnels

Stacktape creates Lambda tunnels when local database emulation is active, unless you pass `--noTunnel`. If your Lambda functions don't access locally-emulated databases, or you only run container workloads, disable tunneling:

```bash
stacktape dev --stage dev --region us-east-1 --noTunnel
```

## Local database emulation

In normal dev mode, selected emulatable databases run locally unless listed in `--remoteResources`. Your workloads receive `STP_*` environment variables with local endpoint values (e.g. `localhost`) instead of AWS endpoints, so code that reads Stacktape-provided variables uses the same lookup path in both dev mode and deployed stacks.

| Config resource type | Local Docker image |
|---|---|
| PostgreSQL / Aurora PostgreSQL | `postgres` |
| MySQL / Aurora MySQL | `mysql` or `mariadb` |
| Redis cluster | `redis` |
| DynamoDB table | `amazon/dynamodb-local` |
| OpenSearch domain | `opensearchproject/opensearch` |

Database data persists between dev mode sessions in `.stacktape/dev-data/{stage}/`. This means you keep your data across restarts without re-seeding.

### Start with a fresh database

Use `--freshDb` to delete existing local database data and start fresh:

```bash
stacktape dev --stage dev --region us-east-1 --freshDb
```

### Connect to a deployed database instead

When you need to test against a real AWS database — for example, to use production-like data or test an engine feature the local emulator doesn't cover — use `--remoteResources` to make a selected emulatable database use its deployed counterpart instead of local emulation:

```bash
stacktape dev --stage dev --region us-east-1 --remoteResources myDatabase
```

The `--remoteResources` flag applies to emulatable database resources (relational databases, Redis, DynamoDB, OpenSearch). Other workloads continue running locally as usual.

For more details on local database setup, supported engines, and troubleshooting, see [Local databases](/local-development/local-databases).

## Environment variables

In normal dev mode, workloads connected to locally-emulated resources receive `STP_*` environment variables pointing to local endpoints instead of AWS endpoints. Resources listed in `--remoteResources` use deployed AWS endpoint values instead, and in legacy mode all resources use deployed values. Dev mode uses the same variable names as deployed stacks — only the values change.

For a [relational database](/resources/databases/relational-database) resource named `myDb` connected to a workload via [`connectTo`](/configuration/connecting-resources), the connection string, host, and port point at the local emulator in normal mode:

```
STP_MY_DB_CONNECTION_STRING=postgres://postgres:postgres@localhost:5432/postgres
STP_MY_DB_HOST=localhost
STP_MY_DB_PORT=5432
```

Code that reads these environment variables works with the same variable lookup path in dev mode and deployed stacks — no conditional logic, no `.env` files, no environment switching.

## Rebuilding workloads

The dev mode terminal accepts commands while running. Type a command and press Enter:

| Command | Action |
|---|---|
| `rs` | Rebuild all workloads |
| `rs <name>` | Rebuild a specific workload by name |
| `c` or `clear` | Clear the log output |
| `q` or `quit` | Stop dev mode and exit |

When running with `--watch`, workloads rebuild automatically on file changes. Without `--watch`, use `rs` after editing code to see changes. Use `rs <name>` to rebuild a single workload without restarting others — useful when iterating on one service in a multi-resource config.

## Lifecycle hooks

Dev mode registers configured `beforeDev` script hooks and displays them in the dev TUI. See [Hooks and scripts](/configuration/hooks-and-scripts) for configuration details, hook types, and the full execution model.

## Normal mode vs legacy mode

Stacktape dev mode supports two modes: **normal** (default) and **legacy**. They serve different workflows and have different prerequisites.

| | Normal mode (default) | Legacy mode |
|---|---|---|
| **Databases** | Emulated locally with Docker | Uses deployed AWS databases |
| **Requires existing deployment** | No — deploys a minimal dev stack automatically | Yes — errors if no deployed stack exists |
| **Lambda tunneling** | Enabled when local databases are active | Not available |
| **Docker required** | Yes — for container workloads and databases | Only for container workloads |
| **Best for** | Daily iteration, self-contained development | Testing against real deployed AWS resources |

### Normal mode

Normal mode is the default. It creates a dedicated dev stack in AWS and emulates databases locally with Docker. This is the recommended mode for daily development — it starts fast after the first run and doesn't depend on a full deployment.

### Legacy mode

Legacy mode connects to an already-deployed stack instead of creating a dedicated dev stack. It does not emulate databases locally — all resources use their deployed AWS counterparts.

```bash
stacktape dev --stage dev --region us-east-1 --devMode legacy
```

Use legacy mode when:
- You want to test workload code against real deployed AWS resources (databases, queues, storage)
- You already have a deployed stage and need to iterate on code without re-provisioning
- You need to connect to AWS services that dev mode cannot emulate locally

Legacy mode requires an existing deployment. If the specified stage has not been deployed, Stacktape shows an error suggesting you [deploy](/cli/deploy) first or switch to normal dev mode.


> **Warning:** Normal dev mode creates a dedicated dev stack separate from a full deployment. If you run normal dev mode against a stage that already has a fully-deployed (non-dev) stack, Stacktape errors and suggests using a different stage name or switching to legacy mode with `--devMode legacy`.

Stacktape auto-recovers (deletes and redeploys a fresh dev stack) when the existing stack is in a failed or in-progress state **and** either the stage name suggests a dev context (contains "dev" or "local") **or** the stack's outputs lack the expected stack-info map. This means auto-deletion can occur on stacks whose names don't include "dev" or "local" if their outputs are missing the stack-info map.


## Agent mode

Agent mode runs dev mode as a background daemon with an HTTP server, keeping workload and local-resource state available for integrations with [AI coding assistants](/using-with-ai/agent-mode-in-dev) and automated workflows.

Start dev mode as an agent:

```bash
stacktape dev --stage dev --region us-east-1 --resources all --agent
```

When `--agentPort` is omitted, Stacktape starts at port 7331 and searches ports 7331–7430 if the default is in use. Use `--agentPort` to request a specific port. If an agent is already running for the same project, the command returns the existing agent's connection details instead of starting a second one.

Stop a running agent with [`stacktape dev:stop`](/cli/dev-stop):

```bash
stacktape dev:stop --agentPort 7331
```

For full agent mode documentation, see [Agent mode in dev](/using-with-ai/agent-mode-in-dev).

## Command reference

For the complete list of flags and options, see the [`stacktape dev`](/cli/dev) CLI reference. For stopping agents, see [`stacktape dev:stop`](/cli/dev-stop).

| Flag | Description |
|---|---|
| `--stage` | Stage name for the dev stack |
| `--region` | AWS region |
| `--resources` | Resources to run (`all` or comma-separated names) |
| `--skipResources` | Resources to exclude from the run |
| `--watch` | Auto-rebuild on file changes |
| `--remoteResources` | Emulatable databases to connect to AWS instead of local emulation |
| `--freshDb` | Delete existing local database data and start fresh |
| `--noTunnel` | Disable Lambda-to-local tunneling |
| `--devMode` | Dev mode type: `normal` (default) or `legacy` |
| `--agent` | Run as a background daemon with HTTP server |
| `--agentPort` | Port for the agent HTTP server (default: 7331) |

## FAQ

### Do I need Docker installed for dev mode?

Yes. Dev mode uses Docker to run container workloads and emulated databases locally. You need Docker Desktop or a compatible Docker runtime installed and running before starting dev mode. Hosting buckets and SSR frontends run through their framework dev servers rather than Docker, and Lambda functions deploy directly to AWS — but most dev mode workflows involve at least one container or database.

### Does dev mode work with all Stacktape resource types?

Dev mode supports container workloads ([web-service](/resources/compute/web-service), [worker-service](/resources/compute/worker-service), [private-service](/resources/compute/private-service), [multi-container-workload](/resources/compute/multi-container-workload)), [Lambda functions](/resources/compute/lambda-function), [hosting buckets](/resources/frontend/static-hosting) (with `dev` config), and all SSR frontends (Next.js, Astro, Nuxt, SvelteKit, SolidStart, TanStack Start, Remix). Local emulation covers relational databases, Redis, DynamoDB, and OpenSearch. Other resource types such as [SQS queues](/resources/messaging/sqs-queue), [SNS topics](/resources/messaging/sns-topic), [S3 buckets](/resources/storage/s3-bucket), and [state machines](/resources/orchestration/state-machine) are not emulated locally — use [legacy mode](#legacy-mode) to work with a fully deployed stack that includes these resources.

### How do Lambda functions connect to local databases in dev mode?

Stacktape creates network tunnels (using a bore-compatible TCP relay) between AWS and your local machine when local database emulation is active. When a Lambda function runs in AWS and needs to reach a locally-emulated database, the tunnel routes traffic from the Lambda execution environment to the Docker container on your machine. This happens automatically — disable it with `--noTunnel` if your Lambda functions don't need local database access.

### How do I reset my local database data?

Use the `--freshDb` flag: `stacktape dev --stage dev --region us-east-1 --freshDb`. This deletes existing local database data and starts fresh Docker containers. Without this flag, database data persists between dev mode sessions in `.stacktape/dev-data/{stage}/`, which is usually what you want during iterative development.

### What is the difference between dev mode and deploying to a dev stage?

Dev mode (`stacktape dev`) runs workloads on your local machine with Docker, deploys only a minimal dev stack to AWS, and gives you instant code-to-result feedback. [Deploying](/cli/deploy) to a dev stage (`stacktape deploy --stage dev`) provisions the full AWS infrastructure — containers on ECS, databases on RDS, Lambda functions, load balancers — and runs everything in the cloud. Use dev mode for rapid daily iteration; use a deployed dev stage for integration testing against real AWS infrastructure.

### Does dev mode cost anything on AWS?

Normal dev mode creates AWS resources for the dev stack, and Lambda functions deployed during dev mode incur standard AWS Lambda charges (pay-per-invocation). Development-level Lambda usage is typically within the AWS free tier. Container workloads and emulated databases run on your machine and don't generate AWS charges. The primary AWS cost during dev mode comes from Lambda invocations and any resources connected via `--remoteResources`.

### Can I run multiple dev mode sessions simultaneously?

You can run separate dev mode sessions for different stages or projects, since each session targets its own dev stack and local Docker containers. Avoid running multiple sessions against the same project and stage because they can contend for the same local containers, ports, and dev stack. Running many concurrent sessions increases local resource usage (CPU, memory, Docker containers, ports).

### Can I use dev mode in a monorepo?

Yes. Point `stacktape dev` at a config file that references the resources you want to run, then use `--resources` to select specific workloads or the interactive picker. Each workload packages and runs independently, so you can iterate on one service while others continue running. See [Monorepo setup](/recipes/monorepo-setup) for configuration patterns.

### How does Stacktape dev mode compare to Docker Compose?

Docker Compose requires manual service definitions, network configuration, and environment wiring. Stacktape dev mode reads your existing Stacktape config and automatically sets up Docker containers, local database emulators, environment variables, and Lambda tunneling. You configure your stack once for production and dev mode handles the local translation. Dev mode also deploys Lambda functions to real AWS infrastructure — Docker Compose can only simulate them.

### When should I use legacy mode instead of normal dev mode?

Use legacy mode (`--devMode legacy`) when you need to test against real deployed AWS databases with production-like data, or work with AWS services that dev mode cannot emulate locally. Legacy mode requires a previously deployed stack and doesn't start local Docker containers for databases. Normal dev mode is better for daily development because it's self-contained, doesn't require a full [deployment](/deployment-and-lifecycle/deploying-stacks), and runs faster after the initial setup.

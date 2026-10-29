# Dev Mode Overview

Stacktape dev mode ([`stacktape dev`](/cli/dev)) runs your workloads locally while connecting to cloud resources, giving you instant feedback without redeploying. Container workloads and emulated databases use Docker. Hosting buckets and supported SSR frontends run through local dev servers. [Lambda functions](/resources/compute/lambda-function) deploy to AWS with logs streamed to your terminal.

## How dev mode works

Dev mode splits your stack between your local machine and AWS. Container workloads run in Docker, frontends run through their framework dev servers, and locally-emulated databases run in Docker containers — while Lambda functions deploy directly to AWS. The first run deploys a dev stack to your AWS account. Unchanged starts reuse the existing stack. A restart can update it after cloud configuration or cloud-image changes, or when required outputs are missing.

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

Lambda functions deployed to AWS reach the databases emulated on your machine through the dev box, a small EC2 instance in your account's shared dev network; see [Connecting to local databases](/local-development/debugging-lambda-functions#connecting-to-local-databases). Local databases are published on `127.0.0.1` only, and nothing is exposed on the internet.

### Startup flow

When you run `stacktape dev`, the following steps execute in order:

1. **Load credentials and configuration** — Stacktape reads your AWS credentials and config file.
2. **Select resources** — You choose which resources to run via the interactive picker, or Stacktape uses the `--resources` and `--skip-resources` flags.
3. **Check references** — Before any AWS work, Stacktape checks every `$ResourceParam` that ends up in the dev stack, so a misspelled parameter or a [reference to a local database](#resources-the-dev-stack-needs-deployed) fails within seconds.
4. **Load AWS metadata** — Stacktape fetches stack information from AWS.
5. **Ensure secrets and SSM parameters** — Stacktape can generate supported missing database credentials. Other missing secrets and SSM parameters require user-supplied values: interactive runs prompt, while agent/noninteractive runs stop with creation instructions. Deleting a dev stage keeps the database secrets dev mode generated; delete one with `stacktape secret delete` when no stage needs it. See [secret ownership](/local-development/debugging-lambda-functions#aws-permissions).
6. **Prepare the dev network** — When deployed functions use local databases or join the VPC, Stacktape creates the account's [dev network](/local-development/debugging-lambda-functions#the-dev-network) on first use, once per account and region, and starts its dev box in the background. A new network's dev box exists after about 1 minute; the next step starts then, while CloudFormation finishes the network. A session that finds another session creating the network continues as soon as the dev box exists, too. A first start that creates the network and the dev stack takes about 5 minutes.
7. **Deploy dev stack** — Create the stack if missing, or update it when cloud configuration, cloud images or required outputs change. Otherwise reuse it.
8. **Start local resources and workloads** — Docker containers start for selected databases, dev mode connects to the dev box, then container workloads, frontends, and Lambda deploys run in parallel.


> **Info:** Unchanged starts skip the dev stack deployment step. Stacktape still loads AWS metadata, prepares local resources, and starts or deploys the selected workloads.


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

Run all resources except specific ones. Use `--skip-resources` alone to run everything except the excluded resources, or combine it with `--resources all`:

```bash
stacktape dev --stage dev --region us-east-1 --skip-resources myDatabase
```

A skipped Lambda function stays in the dev stack without its triggers, so it does not run on queue messages, schedules, stream records or HTTP requests during the session.


> **Tip:** If you misspell a resource name, Stacktape suggests the closest matches using fuzzy matching. The error message also lists all available resource names in your config.


### Watch mode

Auto-rebuild workloads when source files change:

```bash
stacktape dev --stage dev --region us-east-1 --resources all --watch
```

Without `--watch`, you trigger rebuilds manually from the dev mode terminal using the `rs` command (see [Rebuilding workloads](#rebuilding-workloads)).

Watch mode also watches the Stacktape configuration file. A rebuild cannot apply a configuration change, so dev mode tells you to restart it instead.

### Disabling tunnels

Pass `--no-tunnel` to keep deployed Lambda functions away from your local databases for one session:

```bash
stacktape dev --stage dev --region us-east-1 --no-tunnel
```

## Local database emulation

Selected emulatable databases run locally unless listed in `--remote-resources`. When local resources are active, dev mode runs an environment injection step so workloads can use Stacktape-provided `STP_*` variables with local endpoints. Code that reads these variables uses the same lookup path in both dev mode and deployed stacks.

| Config resource type | Local Docker image |
|---|---|
| PostgreSQL / Aurora PostgreSQL | `postgres` |
| MySQL / Aurora MySQL | `mysql` or `mariadb` |
| Redis cluster | `redis` |
| DynamoDB table | `amazon/dynamodb-local` |
| OpenSearch domain | `opensearchproject/opensearch` |

Local database data persists between dev mode sessions under `.stacktape/dev-data/{stage}/`, so you typically keep your data across restarts without re-seeding.

### Start with a fresh database

Use `--fresh-db` to reset databases prepared during startup, including relay dependencies. DynamoDB Local tables share storage; see [reset scope](/local-development/local-databases#resetting-local-data).

```bash
stacktape dev --stage dev --region us-east-1 --fresh-db
```

### Connect to a deployed database instead

When you need to test against a real AWS database — for example, to use production-like data or test an engine feature the local emulator doesn't cover — use `--remote-resources` to make a selected emulatable database use its deployed counterpart instead of local emulation:

```bash
stacktape dev --stage dev --region us-east-1 --remote-resources myDatabase
```

Use `--remote-resources` for emulatable databases when you want dev mode to use the deployed database instead of the local Docker emulator. To make the choice permanent, set `dev.remote: true` on the resource in your config. Functions and local containers that list a remote resource in `connectTo` get the same permissions as in a full deployment.

### Resources the dev stack needs deployed

The dev stack in AWS cannot use a database that runs on your machine, except through the dev box: deployed functions get a local database's address and credentials in their environment variables and through `connectTo`. Two cases need the deployed resource:

- **DynamoDB stream triggers.** A [stream trigger](/resources/triggers/dynamodb-streams) reads the stream of the deployed table, which DynamoDB Local cannot provide. When a deployed function has a stream trigger on a table, dev mode deploys that table in the dev stack automatically and says so when it starts. Local containers and functions then use the deployed table too.
- **Any other reference to a local resource in the dev stack**, for example `iamRoleStatements` with `$ResourceParam('mainTable', 'arn')` on a function or container. Dev mode stops before it starts anything and names the resource and the config path. Add the resource to `--remote-resources` or set `dev.remote: true` on it.

For more details on local database setup, supported engines, and troubleshooting, see [Local databases](/local-development/local-databases).

## Environment variables

Workloads connected to locally-emulated resources receive `STP_*` environment variables pointing to local endpoints instead of AWS endpoints. Dev mode uses the same variable names as deployed stacks — only the values change.

For a [relational database](/resources/databases/relational-database) resource named `myDb` connected to a workload via [`connectTo`](/configuration/connecting-resources), the connection string, host, and port point at the local emulator. For example, a PostgreSQL database may produce variables like:

```
STP_MY_DB_CONNECTION_STRING=postgres://...@localhost:5432/postgres
STP_MY_DB_HOST=localhost
STP_MY_DB_PORT=5432
```

In most applications, reading the Stacktape-provided `STP_*` variables lets the same code path work in dev mode and deployed stacks without conditional logic or environment switching.

Local containers also get `AWS_REGION` and `AWS_DEFAULT_REGION` with the stage's region, as deployed containers do, so AWS SDKs that read either one (boto3 reads only `AWS_DEFAULT_REGION`) find it without a profile.

Code on your machine talks to the dev stack, and deployed functions talk to your local databases, across the distance to the stage's region. In a region far from you, every first connection takes noticeably longer (several hundred milliseconds per round trip), and a client with a short connect timeout can fail. Node.js, for example, gives up on each address after 250 ms by default; raise it with `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000`, or run dev mode in a region close to you.

## Rebuilding workloads

The dev mode terminal accepts commands while running. Type a command and press Enter:

| Command | Action |
|---|---|
| `rs` | Rebuild all workloads |
| `rs <name>` | Rebuild a specific workload by name |
| `c` or `clear` | Clear the log output |
| `q` or `quit` | Stop dev mode and exit |

When running with `--watch`, workloads rebuild automatically on file changes. Without `--watch`, use `rs` after editing code to see changes. Use `rs <name>` to rebuild a single workload without restarting others — useful when iterating on one service in a multi-resource config.

A workload whose rebuild fails, for example because of a syntax error, shows the error and stays failed until a rebuild succeeds. A Lambda function keeps its previous code until then. A rebuild deploys code only: after a change to the configuration file, stop dev mode and start it again.

That start updates the dev stack only when the change reaches it. Changing how a local container is built or started (its `packaging`, including `startCommand`), a frontend's `dev` settings or a local script restarts only what runs on your machine. When the dev stack is updated, functions whose code did not change keep their deployed code.

### Local EFS storage

Configured EFS mounts are not mounted or emulated on local containers. Use explicit local test storage and verify the deployed [EFS configuration](/resources/compute/web-service#efs-storage) in a deployed stage.

## Lifecycle hooks

Dev mode registers configured `beforeDev` script hooks and displays them in the dev TUI. See [Hooks and scripts](/configuration/hooks-and-scripts) for configuration details, hook types, and the full execution model.

## Dev stack isolation

Dev mode creates a dedicated dev stack and refuses to reuse any stack it did not create, regardless of name or status. Use a separate stage name such as `dev`, `dev-local`, or `dev-jane`. To connect selected databases or Redis resources to deployed AWS resources, keep the dedicated dev stage and pass `--remote-resources`.


> **Warning:** Dev mode only updates a stack that `stacktape dev` created. It marks every dev stack with the stack tag `stp:dev-stack`, and refuses any other stack on the stage, whatever its name or status: use a different stage name, or delete that stack with `stacktape delete --stage <stage>` yourself. Dev mode never deletes a stack.

If the first start of a stage fails or is interrupted, CloudFormation rolls the dev stack back. The next `stacktape dev` recognizes the stack by its tag and updates it again. Only a dev stack whose very first create failed (status `ROLLBACK_COMPLETE`) can't be updated; dev mode then asks you to delete it with `stacktape delete --stage <stage>`.


## Agent mode

When started with `--agent`, Stacktape spawns a detached daemon process. The daemon starts the agent server, writes a lock file with process and connection details, and reports readiness back to the parent command, which then exits. See [Agent mode in dev](/using-with-ai/agent-mode-in-dev) for the full guide.

Start dev mode as an agent:

```bash
stacktape dev --stage dev --region us-east-1 --resources all --agent
```

When `--agent-port` is omitted, Stacktape starts at port 7331 and searches ports 7331–7430 if the default is in use. Use `--agent-port` to request a specific port. The agent listens on `127.0.0.1` only, and every request must carry the session token stored in `~/.stacktape/dev-agent-tokens/{port}.token` (see [Authentication](/using-with-ai/agent-mode-in-dev#authentication)). If Stacktape finds an already running dev agent, the command returns that agent's connection details instead of starting another one. A Lambda build or deploy failure can leave the session running with `DEV_STARTED_WITH_FAILURES` and `ready: false`; fix the code and rebuild. A failure that aborts startup is reported separately. Inspect the returned session and status before starting another agent.

While the agent starts, the command prints its progress as JSONL `event` lines: the agent's port first, then the dev network, the dev box, the dev stack deployment with CloudFormation resource counts, and each workload and database. A first start that creates the dev network and the dev stack takes several minutes, and a heartbeat line every 20 seconds names the step it waits for.

Stop the agent of the current project with [`stacktape dev stop`](/cli/dev-stop) (`--stage` chooses between several stages, `--cwd` names another project directory):

```bash
stacktape dev stop --stage dev
```

## Command reference

For the complete list of flags and options, see the [`stacktape dev`](/cli/dev) CLI reference. For stopping agents, see [`stacktape dev stop`](/cli/dev-stop).

| Flag | Description |
|---|---|
| `--stage` | Stage name for the dev stack |
| `--region` | AWS region |
| `--resources` | Resources to run (`all` or comma-separated names) |
| `--skip-resources` | Resources to exclude from the run |
| `--watch` | Auto-rebuild on file changes |
| `--remote-resources` | Emulatable databases to connect to AWS instead of local emulation |
| `--fresh-db` | Start local databases from a fresh state |
| `--no-tunnel` | Skip the tunnels from deployed Lambda functions to local databases |
| `--agent` | Run as a background daemon with HTTP server |
| `--agent-port` | Port for the agent HTTP server (default: 7331) |

## FAQ

### Do I need Docker installed for dev mode?

Yes. Dev mode uses Docker to run container workloads and emulated databases locally. You need Docker Desktop or a compatible Docker runtime installed and running before starting dev mode. Hosting buckets and SSR frontends run through their framework dev servers rather than Docker, and Lambda functions deploy directly to AWS — but most dev mode workflows involve at least one container or database.

### Which resource types does dev mode support, and what isn't emulated locally?

Dev mode supports container workloads ([web-service](/resources/compute/web-service), [worker-service](/resources/compute/worker-service), [private-service](/resources/compute/private-service), [multi-container-workload](/resources/compute/multi-container-workload)), [Lambda functions](/resources/compute/lambda-function), [hosting buckets](/resources/frontend/static-hosting) (with `dev` config), and all SSR frontends (Next.js, Astro, Nuxt, SvelteKit, SolidStart, TanStack Start, Remix). Local emulation covers relational databases, Redis, DynamoDB, and OpenSearch. Other resource types such as [SQS queues](/resources/messaging/sqs-queue), [SNS topics](/resources/messaging/sns-topic), [S3 buckets](/resources/storage/s3-bucket), and [state machines](/resources/orchestration/state-machine) run in the dev stack according to the dev deployment policy, rather than only when selected workloads need them. Batch jobs also run in AWS; restart dev mode to rebuild their images.

### How do Lambda functions connect to local databases in dev mode?

Through the dev box of your account's dev network. Functions connect to the box's private address, and the box forwards each connection to your machine over an encrypted AWS Systems Manager session that your machine opens. Nothing is published on the internet. Bulk transfers are limited to about 0.7 MB/s. See [Connecting to local databases](/local-development/debugging-lambda-functions#connecting-to-local-databases).

### How do I reset my local database data?

Use the `--fresh-db` flag: `stacktape dev --stage dev --region us-east-1 --fresh-db`. This resets databases prepared during startup, including relay dependencies that may be unselected; DynamoDB Local tables share storage. See [reset scope](/local-development/local-databases#resetting-local-data). Without this flag, local database data persists between dev mode sessions under `.stacktape/dev-data/{stage}/`, which is usually what you want during iterative development.

### What is the difference between dev mode and deploying to a dev stage?

Dev mode (`stacktape dev`) runs workloads on your local machine with Docker and deploys a dev stack to your AWS account when one does not already exist. [Deploying](/cli/deploy) to a dev stage (`stacktape deploy --stage dev`) provisions the full AWS infrastructure for your config and runs everything in the cloud. Use dev mode for rapid daily iteration; use a deployed dev stage for integration testing against real AWS infrastructure.

### Does dev mode cost anything on AWS?

Dev mode creates a minimal dev stack in AWS, so AWS charges can come from the AWS resources in that dev stack, Lambda invocations, and any deployed resources you choose to use through `--remote-resources`. The dev box costs about $0.01 per hour while a dev session runs; it stops itself 30 minutes after the last session and then costs about $0.75 per month for its disk and the SSM parameter that holds its relay. Container workloads and locally emulated databases run on your machine and don't generate AWS charges. Small development workloads may fall within AWS Lambda free-tier usage, depending on account eligibility and invocation volume.

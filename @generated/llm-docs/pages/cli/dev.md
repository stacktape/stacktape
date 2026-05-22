# dev

The `stacktape dev` command runs your application locally for development and debugging. It starts workloads on your machine, emulates databases and Redis locally using Docker, injects environment variables, secrets, and AWS credentials into running workloads, and streams logs from running dev workloads — giving you a production-like environment without full deployments.

## Usage

```bash
stacktape dev --stage dev-john --region eu-west-1
```


## CLI Options: `stacktape dev`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--agentChild` | no | `boolean` | Agent Child (internal) Internal flag used when spawning the daemon child process. Do not use directly. | - |
| `--agentPort (-ap)` | no | `number` | Agent Port The port for the agent HTTP server. Providing this option enables agent mode. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--container (-cnt)` | no | `string` | Container Name The name of the container as defined in your container compute resource configuration. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--devMode (-dm)` | no | `string` | Dev Mode Specifies which dev mode to use:

`normal` (default): Deploys a minimal &quot;dev stack&quot; to AWS (IAM roles, secrets only) and runs workloads locally. Databases (PostgreSQL, MySQL, DynamoDB) and Redis are emulated locally using Docker. Tunnels are automatically created so Lambda functions can reach local databases.
`legacy`: Requires an already deployed stack. Runs selected workloads locally while connecting to all deployed AWS resources. No local database emulation - uses deployed databases directly. Useful for testing against production-like data. | `normal`, `legacy` |
| `--disableEmulation (-de)` | no | `boolean` | Disable Emulation Disables the automatic injection of parameters and credentials during local emulation. Use this flag if you want to run a compute resource locally that has not yet been deployed. | - |
| `--dockerArgs (-da)` | no | `array` | Docker Arguments Additional arguments to pass to the `docker run` or `docker build` commands. | - |
| `--freshDb` | no | `boolean` | Fresh Database If `true`, deletes existing local database data before starting. Use this to start with a clean database state. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--noTunnel (-nt)` | no | `boolean` | No Tunnel Disables automatic tunneling for Lambda functions. In normal dev mode, Stacktape creates tunnels (using bore.pub) so that AWS Lambda functions can reach your locally emulated databases. Use this flag if you don&#39;t need Lambda-to-local connectivity or if tunneling causes issues. | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--preserveTempFiles (-ptf)` | no | `boolean` | Preserve Temporary Files If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--remoteResources (-rr)` | no | `array` | Remote Resources In normal dev mode, databases and Redis run locally by default. Use this flag to connect to deployed AWS resources instead. Useful when you need to test against real data or when local emulation is insufficient. Examples: `--remoteResources myDb`, `--remoteResources postgres,redis`. | - |
| `--resourceName (-rn)` | no | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--resources (-res)` | no | `array` | Resources Specify which resources to run in dev mode. Can include workloads (containers, functions) and databases. If not provided, an interactive picker is shown. Use `all` to run all resources without prompting. Examples: `--resources myApi`, `--resources myApi,myDb`, or `--resources all`. | - |
| `--skipResources (-sr)` | no | `array` | Skip Resources Exclude specified resources from dev mode. All other compatible resources will run. Useful when you want to run most resources but exclude a few. Examples: `--skipResources myHeavyDb`, `--skipResources fn1,fn2`. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |
| `--watch (-w)` | no | `boolean` | Watch If `true`, watches for changes to your source files and automatically re-executes the compute resource when a change is detected. | - |


## What it does

The `dev` command supports two modes, selected via the `--devMode` flag.

### Normal mode (default)

Normal mode deploys a minimal "dev stack" to AWS containing only essential infrastructure (IAM roles, secrets), then runs everything else locally. This is the recommended mode for day-to-day development.

- Runs containers, Lambda functions, and frontend workloads locally on your machine
- Emulates databases (PostgreSQL, MySQL, DynamoDB) and Redis locally using Docker
- Sets up tunnels so Lambda functions can reach local databases when Lambda-to-local connectivity is needed
- Creates the dev stack automatically on first run — no pre-deployment required
- Injects environment variables, secrets, and AWS credentials into local workloads

### Legacy mode

Legacy mode requires an already-deployed stack and connects local workloads to the real AWS resources in that stack. Use it when you need to test against production-like data or services that cannot be emulated locally.

```bash
stacktape dev --stage prod --region eu-west-1 --devMode legacy
```

- No local database emulation — uses deployed databases directly
- Requires a stack deployed with [`stacktape deploy`](/cli/deploy) beforehand
- Useful for reproducing issues that only appear against real data

## Supported resource types

The `dev` command can run the following resource types locally:

| Category | Resource types |
|----------|---------------|
| Containers | web-service, private-service, worker-service, multi-container-workload |
| Functions | Lambda functions |
| Frontends | nextjs-web, astro-web, nuxt-web, sveltekit-web, solidstart-web, tanstack-web, remix-web, hosting-bucket (with `dev` config) |
| Databases (emulated in normal mode) | PostgreSQL, MySQL, MariaDB, Redis, DynamoDB, OpenSearch |

## Important flags

### --resources / --skipResources

Control which resources run in dev mode. Without these flags, an interactive picker appears.

Run all resources without prompting:

```bash
stacktape dev --stage dev --region eu-west-1 --resources all
```

Run only specific resources:

```bash
stacktape dev --stage dev --region eu-west-1 --resources myApi,myDb
```

Run everything except a heavy database:

```bash
stacktape dev --stage dev --region eu-west-1 --skipResources myHeavyDb
```

### --watch

Enables automatic file watching. When source files change, the affected workload rebuilds automatically.

```bash
stacktape dev --stage dev --region eu-west-1 --watch
```

### --remoteResources

In normal dev mode, databases and Redis run locally by default. Use `--remoteResources` to connect selected resources to deployed AWS resources instead. This is useful when you need to test against real data or when local emulation is insufficient.

```bash
stacktape dev --stage dev --region eu-west-1 --remoteResources myPostgres
```

### --freshDb

Deletes existing local database data before starting. Use this to start with a clean database state.

```bash
stacktape dev --stage dev --region eu-west-1 --freshDb
```

### --noTunnel

Disables automatic tunneling for Lambda functions. In normal dev mode, Stacktape sets up tunnels so Lambda functions can reach local databases when Lambda-to-local connectivity is needed. Disable this if you don't need that connectivity or if tunneling causes issues.

```bash
stacktape dev --stage dev --region eu-west-1 --noTunnel
```

### --disableEmulation

Disables the automatic injection of parameters and credentials during local emulation. Use this flag when you want to run a compute resource locally before the corresponding deployed resource exists — for example, during initial development before your first deploy.

```bash
stacktape dev --stage dev --region eu-west-1 --disableEmulation
```

### --agent / --agentPort

The `--agent` flag runs dev mode as a detached daemon and enables the agent HTTP server for programmatic control. Agent mode is intended for programmatic/LLM consumption and AI coding-agent workflows. The daemon spawns in the background and the parent process exits after confirming the agent is ready.

```bash
stacktape dev --stage dev --region eu-west-1 --agent
```

Providing `--agentPort` also enables agent mode, so `--agent` is optional when you pass a port. Use `--agentPort` to specify a custom port for the agent HTTP server:

```bash
stacktape dev --stage dev --region eu-west-1 --agentPort 8080
```

Stop a running agent with [`dev:stop`](/cli/dev-stop).

### --resourceName / --container

Use `--resourceName` to name a specific configured resource and `--container` to name a container inside a container compute resource (e.g. multi-container-workload) when a command path needs a specific workload or container context.

```bash
stacktape dev --stage dev --region eu-west-1 --resourceName myService --container api
```

## Interactive commands

While running in interactive mode, you can control dev mode with keyboard commands. The command description supports typing a number + Enter to rebuild a specific workload, or `a` + Enter to rebuild all workloads. The command handler also accepts the following text commands:

| Command | Action |
|---------|--------|
| `rs` | Rebuild all workloads |
| `rs <name>` | Rebuild a specific workload by name |
| `q` or `quit` | Stop dev mode and exit |
| `c` or `clear` | Clear the log output |

## Examples

Basic dev mode with file watching:

```bash
stacktape dev --stage dev-john --region eu-west-1 --watch
```

Run only the API function and database, skip everything else:

```bash
stacktape dev --stage dev --region eu-west-1 --resources myApi,myDatabase
```

Use legacy mode against a deployed staging stack:

```bash
stacktape dev --stage staging --region eu-west-1 --devMode legacy
```

Run locally but connect to a deployed database instead of emulating it:

```bash
stacktape dev --stage dev --region eu-west-1 --remoteResources myDatabase
```

Start a dev agent for AI coding assistant integration:

```bash
stacktape dev --stage dev --region eu-west-1 --agent --resources all
```

Start with a fresh database (deletes existing local data):

```bash
stacktape dev --stage dev --region eu-west-1 --freshDb
```

## FAQ

### What is the difference between normal and legacy dev mode?

Normal mode (default) deploys a minimal dev stack to AWS and emulates databases and Redis locally using Docker. Legacy mode requires an already-deployed stack and connects local workloads to real AWS resources — no local emulation. Use normal mode for day-to-day development; use legacy mode when you need to test against production-like data or services that cannot be emulated.

### Does `stacktape dev` require Docker?

Normal dev mode uses Docker to emulate databases (PostgreSQL, MySQL, MariaDB, DynamoDB, OpenSearch) and Redis locally. You need Docker installed and running on your machine for local database emulation. If you use `--remoteResources` for all databases or run in legacy mode, Docker is not required for database emulation, though container workloads may still use it for local builds.

### When should I use `stacktape dev` vs `stacktape deploy`?

Use [`stacktape dev`](/cli/dev) for iterating on code locally with fast feedback loops — it runs workloads on your machine and emulates databases without a full deployment cycle. Use [`stacktape deploy`](/cli/deploy) when you need to ship to AWS, test in a real cloud environment, or validate production behavior. Dev mode is for development; deploy is for staging, production, or integration testing.

### How do I run only specific resources in dev mode?

Pass `--resources` with a comma-separated list of resource names, or use `--resources all` to run everything without the interactive picker. To run most resources while excluding a few, use `--skipResources`. Without either flag, an interactive multi-select picker appears.

### What does `--remoteResources` do?

In normal dev mode, databases and Redis run locally by default. The `--remoteResources` flag connects specified resources to their deployed AWS counterparts instead of using local emulation. This is useful when local emulation is insufficient or when you need to test against real data. Pass resource names as a comma-separated list: `--remoteResources myPostgres,myRedis`.

### What is agent mode and when should I use it?

Agent mode (`--agent`) runs dev mode as a detached daemon with an HTTP server for programmatic control. It uses JSONL output and disables the interactive terminal UI. Use agent mode when integrating with AI coding agents, automation tools, or any workflow that needs to control dev mode programmatically. Stop a running agent with [`dev:stop`](/cli/dev-stop).

### Can I use `--disableEmulation` during initial setup?

Yes. The `--disableEmulation` flag disables automatic injection of parameters and credentials during local emulation. This is useful when you want to run a compute resource locally before the corresponding deployed resource exists — for example, during initial development before your first [`stacktape deploy`](/cli/deploy).

### How do I reset local database state?

Use the `--freshDb` flag to delete existing local database data before starting dev mode. This gives you a clean database state each time you start, which is useful for testing migrations or resetting test data.

### Can I rebuild workloads without restarting dev mode?

Yes. While dev mode is running interactively, type a number + Enter to rebuild a specific workload, or `a` + Enter to rebuild all. You can also type `rs` to rebuild all workloads, or `rs <name>` to rebuild a specific one by name.

## Related commands

- [`dev:stop`](/cli/dev-stop) — stop a running dev agent
- [`deploy`](/cli/deploy) — deploy your stack to AWS (required before using legacy mode)
- [`debug:logs`](/cli/debug-logs) — fetch logs from deployed resources

# dev

`stacktape dev` runs your app on your machine while it stays connected to AWS. Containers, frontends and local copies of your databases run here; Lambda functions, Batch jobs and AgentCore runtimes run in AWS, in a dev stack that the first start deploys. Dev mode injects connection settings and credentials into each workload and streams their logs. It needs AWS credentials, and Docker for containers and local databases. It works without a Stacktape account. [Dev mode](/local-development/dev-mode-overview) is the full guide.

## Usage

```bash
stacktape dev --stage dev-john --region eu-west-1
```

Use a stage of your own that you never deploy: dev mode refuses a stage that `stacktape deploy` created, and `deploy` refuses a dev stage. The first start deploys the dev stack and, when deployed functions need local databases or a VPC, your account's [dev network](/local-development/debugging-lambda-functions#the-dev-network). That takes a few minutes; later starts reuse both. Stopping dev mode leaves the dev stack in AWS for the next start. Remove it with [`delete`](/cli/delete).

## What runs where

| Resource | Where it runs |
|----------|---------------|
| Web, private and worker services, multi-container workloads | Your machine, in Docker |
| Next.js, Astro, Nuxt, SvelteKit, SolidStart, TanStack Start, Remix, hosting buckets with `dev` config | Your machine, on their dev servers |
| Relational databases, DynamoDB, Redis, OpenSearch | Your machine, in Docker, published on `127.0.0.1` only. `--remote-resources` uses the deployed ones instead. |
| Lambda functions | AWS, built on your machine. They reach local databases through the dev network. |
| Batch jobs and AgentCore runtimes | AWS. Their images are rebuilt only when dev mode starts. |
| Queues, topics, buckets, gateways and other cloud resources | AWS, in the dev stack |

The dev stack has no alarms, so errors you cause on purpose while developing don't notify anyone.

## Important flags

### --resources / --skip-resources

Select Lambda functions, local containers, frontends and emulated databases. Without these flags, an interactive picker appears. Unselected functions remain in the dev stack with their configured triggers removed. Selection limits session rebuild/watch. A dev-stack update does not build unselected functions: they keep the code they run, which may not match your source, and status lists them with when that code was deployed. They are built when the dev stack has no code for them yet or their configuration changed, and then an unselected function that does not build fails the start. Batch jobs cannot be selected or skipped: they run in AWS when triggered, and their images update only when dev mode starts. Use a dev-specific configuration to omit a job or disable its triggers.

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
stacktape dev --stage dev --region eu-west-1 --skip-resources myHeavyDb
```

### --watch

Enables automatic file watching. When source files change, Stacktape automatically re-executes the affected compute resource.

```bash
stacktape dev --stage dev --region eu-west-1 --watch
```

### --remote-resources

Databases and Redis run locally by default. Use `--remote-resources` to connect selected resources to deployed AWS resources instead. This is useful when you need to test against real data or when local emulation is insufficient.

```bash
stacktape dev --stage dev --region eu-west-1 --remote-resources myPostgres
```

### --fresh-db

Deletes data, schema and local credential/identity files for databases prepared during startup, including deployed-workload relay dependencies that may be unselected. Other persisted databases are untouched. DynamoDB Local shares storage across tables, so resetting it removes every persisted table in that storage. See [reset scope](/local-development/local-databases#resetting-local-data).

```bash
stacktape dev --stage dev --region eu-west-1 --fresh-db
```

### --no-tunnel

Skips the tunnels from deployed Lambda functions to local databases. Without it, functions that use a local database reach it through the dev box of your account's dev network; see [Connecting to local databases](/local-development/debugging-lambda-functions#connecting-to-local-databases). VPC functions still run in the dev network.

```bash
stacktape dev --stage dev --region eu-west-1 --no-tunnel
```

### --take-over

Moves a stage that another `stacktape dev` session runs, on another machine or in another worktree, to this session. Without it, `stacktape dev` refuses to start a stage whose deployed functions already reach another session's databases, and names that session. With it, the functions reach the databases on this machine, their open database connections to the other session are closed, and the other session stops itself with a message that names this one, so it cannot redeploy functions over yours.

```bash
stacktape dev --stage dev --region eu-west-1 --take-over
```

### --no-emulation

`--no-emulation` affects selected local directive-resolution behavior. Dev mode still deploys its AWS dev stack and uses the normal container role-credential and connection-variable paths. This flag does not make dev mode offline or suppress credential injection.

```bash
stacktape dev --stage dev --region eu-west-1 --no-emulation
```

### --agent / --agent-port

On `dev`, `--agent` does more than on other commands, where it only switches the output to JSONL. It runs dev mode as a background session with a local HTTP API that a coding agent uses to check status, rebuild workloads, read logs and query local databases. The command returns once the session is ready. [Agent mode in dev](/using-with-ai/agent-mode-in-dev) documents the API.

```bash
stacktape dev --stage dev --region eu-west-1 --agent
```

The background session does not confirm anything. When the project named with `--project` does not exist yet, `dev --agent` fails with `CONFIRMATION_REQUIRED` before it deploys. Check the name and run it again with `--yes` to create the project:

```bash
stacktape dev --stage dev --region eu-west-1 --agent --yes
```

Passing `--agent-port` also starts the background session, so `--agent` is optional when you pass a port. Use it to choose the HTTP API's port:

```bash
stacktape dev --stage dev --region eu-west-1 --agent-port 8080
```

Stop a running agent with [`dev stop`](/cli/dev-stop).

## Keyboard shortcuts

In the terminal view, dev mode takes these keys:

| Key | Action |
|---|---|
| **Ctrl+R** | Rebuild. With several workloads, pick one by its number, `a` for all, or Esc to cancel |
| **Ctrl+A** | Rebuild all workloads |
| **Tab** | Switch between the overview and the logs |
| **Ctrl+C** | Stop dev mode |

## Examples

Basic dev mode with file watching:

```bash
stacktape dev --stage dev-john --region eu-west-1 --watch
```

Run only the API function and database, skip everything else:

```bash
stacktape dev --stage dev --region eu-west-1 --resources myApi,myDatabase
```

Run locally but connect to a deployed database instead of emulating it:

```bash
stacktape dev --stage dev --region eu-west-1 --remote-resources myDatabase
```

Start a dev agent for AI coding assistant integration:

```bash
stacktape dev --stage dev --region eu-west-1 --agent --resources all
```

Start with a fresh database (deletes existing local data):

```bash
stacktape dev --stage dev --region eu-west-1 --fresh-db
```

## Free plan limit reached

This applies only when the CLI is signed in to an organization on the Console's Free plan; without a Stacktape account there is no limit. Dev mode deploys a dev stack, so it follows the same [Free plan cost limit](/cli/deploy#free-plan-cost-limit) as `deploy`: $200 of managed AWS costs per UTC month, with a one-time grace period of up to 7 days, within that UTC month, the first time an organization goes over. After that, dev mode stops before it deploys anything and prints the costs and the upgrade link. Running infrastructure keeps working, and so do [`dev stop`](/cli/dev-stop) and [`delete`](/cli/delete).

## Options


## CLI Options: `stacktape dev`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--agent` | no | `boolean` | Background Dev Session — For coding agents: runs dev mode as a background session with a local HTTP API for status, logs, rebuilds and database queries. The command returns once the session is ready. Its result names the API port, the token file and the log file, and the session keeps running until `stacktape dev stop`. It does not confirm anything: when the project does not exist yet, creating it fails with `CONFIRMATION_REQUIRED` unless you add `--yes`. See [Agent mode in dev](https://docs.stacktape.com/using-with-ai/agent-mode-in-dev/). | - |
| `--agent-port` | no | `number` | Agent Port — The port of the background session's HTTP API. Implies `--agent`. By default, the first free port from 7331. | - |
| `-y, --yes` | no | `boolean` | Auto-Confirm Operation — Confirms an operation that would otherwise ask first: deleting a stack, an update that may delete stateful resources, creating a project that does not exist yet, and the other deletions that ask. Without a terminal to ask in (CI, `--agent`, machine-readable output), such an operation fails with `CONFIRMATION_REQUIRED` unless this flag is set. `--agent` does not confirm anything. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. Without it, Stacktape uses the one `stacktape.ts`, `stacktape.yml`, `stacktape.yaml` or `stacktape.js` in the working directory. When there are several, the command stops and asks you to choose one with this option. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--no-emulation` | no | `boolean` | Disable Emulation — Affects selected local directive-resolution behavior. Dev mode still deploys its AWS dev stack and uses normal container role credentials and connection variables; this flag does not make it offline or suppress credential injection. | - |
| `--docker-args` | no | `array` | Docker Arguments — Additional arguments to pass to the `docker run` or `docker build` commands. | - |
| `--fresh-db` | no | `boolean` | Fresh Database — If `true`, deletes data, schema and local credential/identity files for databases prepared during startup, including unselected relay dependencies. Other persisted databases are untouched. DynamoDB Local shares storage: resetting it removes every persisted table there. The stage password can be reused. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--no-tunnel` | no | `boolean` | No Tunnel — Disables tunnels from deployed Lambda functions to your locally emulated databases. Without this flag, functions that use a local database reach it through the dev box of your account's dev network, over an encrypted AWS Systems Manager session from your machine. With it, they cannot reach local databases; use `--remote-resources` to connect them to the deployed databases instead. VPC functions still run in the dev network. | - |
| `--keep-temp-files` | no | `boolean` | Preserve Temporary Files — If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--remote-resources` | no | `array` | Remote Resources — Databases and Redis run locally by default. Use this flag to connect selected resources to their deployed AWS counterparts instead. Useful when you need to test against real data or when local emulation is insufficient. Examples: `--remote-resources myDb`, `--remote-resources postgres,redis`. | - |
| `--resources` | no | `array` | Resources — Specify which resources to run in dev mode. Select functions, local containers, frontends and emulated databases. Batch jobs run in AWS and cannot be selected or skipped. Unselected functions remain in the dev stack without configured triggers. Selection limits session rebuild/watch. A dev-stack update does not build unselected functions: they keep the code they run, and status lists them with when that code was deployed. They are built when the dev stack has no code for them yet or their configuration changed, and then an unselected function that does not build fails the start. If not provided, an interactive picker is shown. Use `all` to run all resources without prompting. Examples: `--resources myApi`, `--resources myApi,myDb`, or `--resources all`. | - |
| `--skip-resources` | no | `array` | Skip Resources — Exclude selectable functions, local containers, frontends and emulated databases from dev mode. Unselected functions remain deployed without their configured triggers. Selection limits session rebuild/watch. A dev-stack update does not build unselected functions: they keep the code they run, and status lists them with when that code was deployed. They are built when the dev stack has no code for them yet or their configuration changed, and then an unselected function that does not build fails the start. Batch jobs cannot be skipped with this flag. All other compatible resources will run. Useful when you want to run most resources but exclude a few. Examples: `--skip-resources myHeavyDb`, `--skip-resources fn1,fn2`. | - |
| `--take-over` | no | `boolean` | Take Over — Moves a stage that another `stacktape dev` session runs, on another machine or in another terminal, to this session. Without this flag, `stacktape dev` refuses to start a stage that runs elsewhere. With it, deployed functions reach the databases on this machine, their open database connections to the other session are closed, and the other session stops itself. | - |
| `--watch` | no | `boolean` | Watch — If `true`, rebuilds a function or container when one of its source files changes: functions are redeployed to the dev stack and containers restart with the new build. Frontend dev servers reload on their own. A change to the configuration file that a rebuild cannot apply is reported as needing a restart. | - |


## Related commands

- [`dev stop`](/cli/dev-stop) — stop a running dev agent
- [`dev network`](/cli/dev-network) — see or delete the dev network that connects deployed functions to local databases
- [`deploy`](/cli/deploy) — deploy your stack to AWS
- [`logs`](/cli/logs) — fetch logs from deployed resources

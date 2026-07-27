# info:stack

The `info:stack` command displays detailed information about a deployed stack, including its outputs (URLs, endpoints, resource identifiers) and the list of AWS resources in the stack. Use it after [deploying](/cli/deploy) to discover endpoints, verify resource creation, or feed stack data into scripts and CI pipelines.

## Usage

```bash
stacktape info:stack --region eu-west-1 --projectName my-project --stage prod
```

Alternatively, pass the stack name directly.

```bash
stacktape info:stack --region eu-west-1 --stackName my-project-prod
```

The `--region` flag is the only required argument. You identify the target stack in one of two ways: provide `--stackName` directly (formatted as `projectName-stage`), or provide both `--projectName` and `--stage` together. If neither combination is supplied, the command exits with an error: *"Provide either --stackName OR both --projectName and --stage"*.

With `--agent`, `info:stack` skips the interactive stack-details view and prints a JSON-formatted payload containing the resolved stack name, region, and returned details. This is useful in CI scripts or when piping output to tools like `jq`.

The `--awsAccount` flag selects which connected AWS account to query. The account must first be connected in the [Stacktape Console](/stacktape-console/connecting-your-aws-account). Omit it when the default account selection is sufficient.

## Command reference


## CLI Options: `stacktape info:stack`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--stackName (-sn)` | no | `string` | Stack Name The name of the CloudFormation stack (format: projectName-stage). | - |
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |


## Examples

Inspect a production stack to retrieve its outputs (URLs, resource identifiers).

```bash
stacktape info:stack --region us-east-1 --projectName my-api --stage prod
```

Use the combined stack name instead of separate project and stage flags.

```bash
stacktape info:stack --region us-east-1 --stackName my-api-prod
```

Get JSON output for a CI pipeline or script. With `--agent`, the command skips the interactive view and prints a JSON-formatted payload containing the stack name, region, and details.

```bash
stacktape info:stack --region eu-west-1 --projectName my-api --stage staging --agent
```

Query a stack in a specific connected AWS account.

```bash
stacktape info:stack --region us-west-2 --projectName payments --stage prod --awsAccount production-account
```

## Related commands

- [`info:stacks`](/cli/info-stacks) — List all stacks deployed in a region. Use this to discover stack names before drilling into one with `info:stack`.
- [`info:operations`](/cli/info-operations) — View recent deployment operations and their success/failure status for a project or stage.
- [`deploy`](/cli/deploy) — Deploy or update a stack. After deploying, use `info:stack` to retrieve the resulting outputs and endpoints.
- [`param:get`](/cli/param-get) — Retrieve a single parameter value from a resource in a deployed stack, rather than the full stack overview.

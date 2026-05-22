# param:get

Retrieve the runtime value of a [referenceable parameter](/configuration/referenceable-parameters) from a resource in a deployed stack. Use `param:get` to fetch URLs, connection strings, ARNs, and other outputs directly from the CLI — without opening the AWS Console or parsing CloudFormation outputs. The three required arguments are `--region`, `--resourceName`, and `--paramName`.

## Usage

```bash
stacktape param:get --region eu-west-1 --resourceName myApi --paramName url
```

The command does not require a local Stacktape configuration file. The required CLI arguments are `--region`, `--resourceName`, and `--paramName`; optional stack-selection arguments such as `--stage` or `--projectName` can still be used when needed to identify the target stack. If you have configured defaults for region or stage via [`defaults:configure`](/cli/defaults-configure), those values apply automatically and can be omitted from the invocation.

Common scenarios for `param:get`:

- Feed an endpoint URL into a local script or test harness.
- Retrieve a database connection string for a one-off migration tool.
- Read a resource ARN to pass into another CLI command or CI step.
- Verify the actual deployed value of a parameter after a deploy completes.

If you need a broader overview of all stack outputs and resources at once, use [`info:stack`](/cli/info-stack) instead.

## Arguments reference


## CLI Options: `stacktape param:get`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--paramName (-pn)` | yes | `string` | Parameter Name The name of the resource parameter. | - |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |


## Examples

Retrieve a parameter from a deployed resource.

```bash
stacktape param:get --region us-east-1 --resourceName api --paramName url
```

Pass `--stage` when you want to target a specific stage explicitly. Include it unless you have set a default stage via [`defaults:configure`](/cli/defaults-configure).

```bash
stacktape param:get --region eu-west-1 --stage production --resourceName mainDatabase --paramName connectionString
```

Capture the output in a shell variable for use in scripts or CI steps.

```bash
API_URL=$(stacktape param:get --region eu-west-1 --resourceName api --paramName url)
```

Use `--agent` to get machine-readable JSONL output, suitable for programmatic consumption or piping into other tools.

```bash
stacktape param:get --region eu-west-1 --resourceName api --paramName url --agent
```


> **Info:** The available parameter names depend on the resource type. See [referenceable parameters](/configuration/referenceable-parameters) for the full list grouped by resource type.


## Error handling

If the resource name does not exist in the deployed stack overview, the command throws the missing-resource error (`e77`) for that stack and resource lookup. Double-check the `--resourceName` value matches the key used in your Stacktape configuration.

If the parameter name is not found for the given resource, the command throws the invalid-parameter error (`e78`) and passes the resource type plus the available referenceable parameter names to the error handler. This makes it straightforward to discover the correct parameter name without leaving the terminal.

## FAQ

### How do I find the available parameter names for a resource?

Each Stacktape resource type exposes a specific set of referenceable parameters. The full list is documented at [referenceable parameters](/configuration/referenceable-parameters). You can also trigger the `e78` error intentionally by passing an invalid `--paramName` — the error output includes the valid parameter names for that resource type.

### Does param:get require a deployed stack?

Yes. The command queries a deployed stack to read the parameter's runtime value. If the stack has not been deployed yet, there is nothing to retrieve. Deploy first with [`deploy`](/cli/deploy), then use `param:get` to read outputs.

### Can I use param:get in CI/CD pipelines?

Yes. Since `param:get` prints the parameter value to stdout, you can capture it in a shell variable and pass it to subsequent pipeline steps. Use `--agent` or `--outputFormat jsonl` for machine-readable output that is easier to parse programmatically.

### What is the difference between param:get and info:stack?

[`param:get`](/cli/param-get) retrieves a single parameter value from a single resource — ideal for scripting and automation. [`info:stack`](/cli/info-stack) returns a broader overview of all outputs and AWS resources in the stack — better for exploration and discovery after a deployment.

### Do I need to pass --stage every time?

No. The `--stage` flag is optional. If you have configured a default stage using [`defaults:configure`](/cli/defaults-configure), it applies automatically. Pass `--stage` explicitly when you need to override the default or when no default is set.

## Related commands

- [`info:stack`](/cli/info-stack) — view all outputs and resources in a deployed stack.
- [`compile-template`](/cli/compile-template) — inspect the generated CloudFormation template to see which parameters a resource exposes.
- [`defaults:configure`](/cli/defaults-configure) — set default region and stage so you can omit them from repeated commands.

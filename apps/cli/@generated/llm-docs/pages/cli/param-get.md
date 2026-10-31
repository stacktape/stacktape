# param get

Retrieve the runtime value of a [referenceable parameter](/configuration/referenceable-parameters) from a resource in a deployed stack. Use `param get` to fetch URLs, connection strings, ARNs, and other outputs directly from the CLI — without opening the AWS Console or parsing CloudFormation outputs. The three required arguments are `--region`, `--resource-name`, and `--param-name`.

## Usage

```bash
stacktape param get myApi url --region eu-west-1
```

The command does not require a local Stacktape configuration file. The command takes the resource name and the parameter name as positional arguments (`param get <resource-name> <param-name>`) and requires `--region`; optional stack-selection arguments such as `--stage` or `--project` can still be used when needed to identify the target stack. `--stage` is optional; pass it when you need to target a specific stage explicitly.

Common scenarios for `param get`:

- Feed an endpoint URL into a local script or test harness.
- Retrieve a database connection string for a one-off migration tool.
- Read a resource ARN to pass into another CLI command or CI step.
- Verify the actual deployed value of a parameter after a deploy completes.

If you need a broader overview of all stack outputs and resources at once, use [`status`](/cli/info-stack) instead.

## Arguments reference


## CLI Options: `stacktape param get`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--param-name (positional 2)` | yes | `string` | Parameter Name — The name of the resource parameter. | - |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resource-name (positional 1)` | yes | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--show-secrets` | no | `boolean` | Show Sensitive Values — If `true`, includes sensitive values in the output of commands such as `status`, `deploy`, and `param get`. Be cautious when using this flag, as mishandling sensitive data can create security risks. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters and no fixed maximum. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |


## Examples

Retrieve a parameter from a deployed resource.

```bash
stacktape param get api url --region us-east-1
```

Pass `--stage` when you want to target a specific stage explicitly. Include it unless you have set a default stage via [`defaults set`](/cli/defaults-configure).

```bash
stacktape param get mainDatabase connectionString --region eu-west-1 --stage production
```

For programmatic consumption in scripts or CI steps, use `--agent` or `--json` to get machine-readable JSONL output. The default interactive output includes formatting that is not suitable for shell variable capture.

```bash
stacktape param get api url --region eu-west-1 --agent
```


> **Info:** The available parameter names depend on the resource type. See [referenceable parameters](/configuration/referenceable-parameters) for the full list grouped by resource type.


## Error handling

If the resource name does not exist in the deployed stack overview, the command throws the missing-resource error (`e77`) for that stack and resource lookup. Double-check that the resource name matches the key used in your Stacktape configuration.

If the parameter name is not found for the given resource, the command throws the invalid-parameter error (`e78`) and passes the resource type plus the available referenceable parameter names to the error handler. This makes it straightforward to discover the correct parameter name without leaving the terminal.

## FAQ

### How do I find the available parameter names for a resource?

Each Stacktape resource type exposes a specific set of referenceable parameters. The full list is documented at [referenceable parameters](/configuration/referenceable-parameters). You can also trigger the `e78` error intentionally by passing an invalid `--param-name` — the error output includes the valid parameter names for that resource type.

### Does param get require a deployed stack?

Yes. The command queries a deployed stack to read the parameter's runtime value. If the stack has not been deployed yet, there is nothing to retrieve. Deploy first with [`deploy`](/cli/deploy), then use `param get` to read outputs.

### How do I capture the value in a shell script or CI step?

Pass `--agent` or `--json` to get machine-readable JSONL output (one JSON object per line). The default interactive output includes colors and formatting that are not suitable for capturing into a shell variable or parsing in a pipeline step.

### What is the difference between param get and status?

[`param get`](/cli/param-get) retrieves a single parameter value from a single resource — ideal for scripting and automation. [`status`](/cli/info-stack) returns a broader overview of all outputs and AWS resources in the stack — better for exploration and discovery after a deployment.

## Related commands

- [`status`](/cli/info-stack) — view all outputs and resources in a deployed stack.
- [`synth`](/cli/synth) — compile your Stacktape configuration into a CloudFormation template for inspection before deployment.
- [`defaults set`](/cli/defaults-configure) — set default region and stage so you can omit them from repeated commands.

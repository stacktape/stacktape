# status

The `status` command displays detailed information about a deployed stack, including its outputs (URLs, endpoints, resource identifiers) and the list of AWS resources in the stack. Use it after [deploying](/cli/deploy) to discover endpoints, verify resource creation, or feed stack data into scripts and CI pipelines.

## Usage

```bash
stacktape status --region eu-west-1 --project my-project --stage prod
```

Alternatively, pass the stack name directly.

```bash
stacktape status --region eu-west-1 --stack-name my-project-prod
```

The `--region` flag is the only required argument. You identify the target stack in one of two ways: provide `--stack-name` directly (formatted as `projectName-stage`), or provide both `--project` and `--stage` together. If neither combination is supplied, the command exits with an error: *"Provide either --stack-name OR both --project and --stage"*.

With `--agent`, `status` skips the interactive stack-details view and uses the CLI's JSONL protocol. The final `result` event contains a versioned `stacktape.info-stack.v1` document at `data.result`, including the resolved stack name, region, outputs, Stacktape resource map, and CloudFormation resources. Read the final result event rather than parsing informational log messages.

The `--aws-account` flag selects which connected AWS account to query. The account must first be connected in the [Stacktape Console](/stacktape-console/connecting-your-aws-account). Omit it when the default account selection is sufficient.

## Command reference


## CLI Options: `stacktape status`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--stack-name` | no | `string` | Stack Name — The name of the CloudFormation stack (format: projectName-stage). | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |


## Examples

Inspect a production stack to retrieve its outputs (URLs, resource identifiers).

```bash
stacktape status --region us-east-1 --project my-api --stage prod
```

Use the combined stack name instead of separate project and stage flags.

```bash
stacktape status --region us-east-1 --stack-name my-api-prod
```

Get versioned JSONL output for a CI pipeline, coding agent, or script.

```bash
stacktape status --region eu-west-1 --project my-api --stage staging --agent
```

The stable command document is nested in the final event:

```json
{
  "type": "result",
  "ok": true,
  "data": {
    "result": {
      "schemaVersion": "stacktape.info-stack.v1",
      "stackName": "my-api-staging",
      "region": "eu-west-1",
      "description": null,
      "stackOutput": {},
      "stackInfoMap": null,
      "resources": []
    }
  }
}
```

Query a stack in a specific connected AWS account.

```bash
stacktape status --region us-west-2 --project payments --stage prod --aws-account production-account
```

## Related commands

- [`stack list`](/cli/info-stacks) — List all stacks deployed in a region. Use this to discover stack names before drilling into one with `status`.
- [`stack history`](/cli/info-operations) — View recent deployment operations and their success/failure status for a project or stage.
- [`deploy`](/cli/deploy) — Deploy or update a stack. After deploying, use `status` to retrieve the resulting outputs and endpoints.
- [`param get`](/cli/param-get) — Retrieve a single parameter value from a resource in a deployed stack, rather than the full stack overview.

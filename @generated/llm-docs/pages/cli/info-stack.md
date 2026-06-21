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

<CliCommandsApiReference command="info:stack" sortedArgs={[
  {
    "name": "region",
    "required": true,
    "alias": "r",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "us-east-2",
      "us-east-1",
      "us-west-1",
      "us-west-2",
      "ap-east-1",
      "ap-south-1",
      "ap-northeast-3",
      "ap-northeast-2",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-northeast-1",
      "ca-central-1",
      "eu-central-1",
      "eu-west-1",
      "eu-west-2",
      "eu-west-3",
      "eu-north-1",
      "me-south-1",
      "sa-east-1",
      "af-south-1",
      "eu-south-1"
    ],
    "shortDescription": "<p> AWS Region</p>\n",
    "longDescription": "<p>The AWS region for the operation. For a list of available regions, see the <a href=\"https://docs.aws.amazon.com/general/latest/gr/rande.html\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">AWS documentation</a>.</p>\n"
  },
  {
    "name": "agent",
    "required": false,
    "alias": "ag",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Agent Mode</p>\n",
    "longDescription": "<p>Optimizes CLI output for programmatic/LLM consumption:</p>\n<ul>\n<li>Uses strict JSONL/NDJSON output (one JSON object per line)</li>\n<li>Disables interactive terminal UI</li>\n<li>Automatically confirms operations (equivalent to --autoConfirmOperation)\nFor dev command: also enables HTTP server for programmatic control.</li>\n</ul>\n"
  },
  {
    "name": "awsAccount",
    "required": false,
    "alias": "aa",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Account</p>\n",
    "longDescription": "<p>The name of the AWS account to use for the operation. The account must first be connected in the <a href=\"https://console.stacktape.com/aws-accounts\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Stacktape console</a>.</p>\n"
  },
  {
    "name": "logLevel",
    "required": false,
    "alias": "ll",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "info",
      "debug",
      "error"
    ],
    "shortDescription": "<p> Log Level</p>\n",
    "longDescription": "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
  },
  {
    "name": "outputFormat",
    "required": false,
    "alias": "ofmt",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "jsonl",
      "plain",
      "tty"
    ],
    "shortDescription": "<p> Output Format</p>\n",
    "longDescription": "<p>Controls the CLI output format:</p>\n<ul>\n<li><code>jsonl</code>: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.</li>\n<li><code>plain</code>: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.</li>\n<li><code>tty</code>: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.\nIf not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl.</li>\n</ul>\n"
  },
  {
    "name": "projectName",
    "required": false,
    "alias": "prj",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Project Name</p>\n",
    "longDescription": "<p>The name of the Stacktape project for this operation.</p>\n"
  },
  {
    "name": "stackName",
    "required": false,
    "alias": "sn",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stack Name</p>\n",
    "longDescription": "<p>The name of the CloudFormation stack (format: projectName-stage).</p>\n"
  },
  {
    "name": "stage",
    "required": false,
    "alias": "s",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stage</p>\n",
    "longDescription": "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
  }
]} />

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

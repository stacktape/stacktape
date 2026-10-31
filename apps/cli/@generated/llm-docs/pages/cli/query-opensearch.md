# query opensearch

The `query opensearch` command runs read-only queries against a deployed [OpenSearch domain](/resources/databases/opensearch) directly from your terminal. Use it to list indices, check document counts, inspect field mappings, retrieve individual documents, or search with Query DSL — without setting up a separate OpenSearch client or dashboard.

## Usage

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation indices
```

The command takes the domain's resource name as a positional argument (`query opensearch <resource-name>`) and always requires `--stage` and `--region`. The resource name must match an OpenSearch domain resource defined in your Stacktape configuration. Additional flags depend on the operation.

## Operations

The `--operation` flag selects what kind of query to run. Five operations are available: `indices`, `mapping`, `count`, `get`, and `search`. If omitted, the command defaults to `indices`.

### indices

Lists all indices in the OpenSearch domain. This is the default operation and the best starting point when exploring an unfamiliar domain. No additional flags are needed.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation indices
```

### mapping

Returns the field mapping for a specific index — useful for understanding the index schema before writing search queries. Requires `--index`.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation mapping --index users
```

### count

Returns the document count. You can pass `--index` to count documents in a specific index; omit it to count across all indices.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation count --index orders
```

Count across the entire domain (no `--index`):

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation count
```

### get

Retrieves a single document by ID. Requires both `--index` and `--id`.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation get --index users --id doc123
```

### search

Runs an OpenSearch Query DSL search. Requires `--query` with a valid JSON string. You can optionally scope the search to a specific index with `--index` and control result count with `--limit` (defaults to 10).

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation search --query "{\"match_all\": {}}"
```

Search within a specific index with a limited result set:

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation search --index users --query "{\"match\": {\"name\": \"alice\"}}" --limit 5
```


> **Info:** The `--query` flag accepts [OpenSearch Query DSL](https://opensearch.org/docs/latest/query-dsl/) as a JSON string. The command parses the JSON before sending it — malformed JSON is rejected with `Invalid JSON in --query` and the hint `Provide valid OpenSearch query DSL JSON`. On Windows, escape inner double quotes with backslashes. On Linux/macOS, wrap the entire value in single quotes.


## Agent mode

When running with `--agent`, the command prints a structured JSON object containing `ok`, `resource`, `operation`, and the operation result. This makes it suitable for programmatic consumption by AI coding assistants and automation scripts.

```bash
stacktape query opensearch mySearch --agent --stage prod --region eu-west-1 --operation indices
```

For automation, prefer `--agent`. The global `--output-format` flag is documented in the flags reference below.

## Flags reference


## CLI Options: `stacktape query opensearch`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resource-name (positional 1)` | yes | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--id` | no | `string` | Document ID — ID of the document to retrieve (for OpenSearch get operation). | - |
| `--index` | no | `string` | Database Index — Index name. For DynamoDB: secondary index to query. For OpenSearch: index to search. | - |
| `--limit` | no | `number` | Limit — Maximum number of items to return. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--operation` | no | `string` | Database Operation — The operation to perform (varies by database type). | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--query` | no | `string` | Logs Query — CloudWatch Logs Insights query string. Example: "fields @timestamp, @message \| filter @message like /ERROR/ \| limit 50" | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

### Check what indices exist

Start here when exploring an unfamiliar OpenSearch domain. The `indices` operation is the default, so `--operation` can be omitted.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1
```

### Inspect field mappings for an index

Useful for understanding the schema before writing search queries.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation mapping --index products
```

### Count all documents in the domain

Omit `--index` to get a total count across every index.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation count
```

### Count documents in a specific index

Pass `--index` to scope the count.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation count --index orders
```

### Retrieve a specific document by ID

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation get --index users --id user-42
```

### Run a full-text search

The `--query` flag takes OpenSearch Query DSL as a JSON string. This example searches for error-level log entries across the `logs` index.

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation search --index logs --query "{\"match\": {\"level\": \"error\"}}" --limit 20
```

### Match all documents in an index

```bash
stacktape query opensearch mySearch --stage prod --region eu-west-1 --operation search --index products --query "{\"match_all\": {}}" --limit 50
```

### Use agent mode for automation

Parse the JSON result programmatically in a CI pipeline or AI coding assistant.

```bash
stacktape query opensearch mySearch --agent --stage prod --region eu-west-1 --operation count --index users
```

## Related commands

- [`query sql`](/cli/query-sql) — run read-only SQL queries against a deployed relational database.
- [`query dynamodb`](/cli/query-dynamodb) — query a deployed DynamoDB table.
- [`query redis`](/cli/query-redis) — query a deployed Redis cache.
- [`aws call`](/cli/aws-call) — execute read-only AWS SDK commands against any deployed resource.
- [`logs`](/cli/logs) — fetch and analyze logs from deployed resources.

## FAQ

### Which flags does each operation require?

The `mapping` operation requires `--index`. The `get` operation requires both `--index` and `--id`. The `search` operation requires `--query`. For `indices`, no additional flags are needed. For `count`, `--index` is optional — omit it to count across all indices.

### Do I need a bastion host to query OpenSearch?

No. The command reads the deployed domain endpoint from the stack, connects over HTTPS, and authenticates with the stack's read-only debug role. The role can send only GET and HEAD requests to the stack's own domains, so the command sends searches as GET with the query in the request body. OpenSearch refuses the role any other request, such as indexing, updating or deleting documents. The command also refuses an `--index` that contains `/` or starts with `_`, since that would reach another endpoint rather than an index. When the stack has no such role or it cannot be assumed, the command fails instead of using your configured AWS credentials. Unlike [`query sql`](/cli/query-sql) or [`query redis`](/cli/query-redis), `query opensearch` does not accept a `--bastion-resource` flag.

### What format does the --query flag expect?

The `--query` flag accepts a JSON string containing an [OpenSearch Query DSL](https://opensearch.org/docs/latest/query-dsl/) query body. The command parses the JSON before sending it. If the JSON is malformed, the command rejects it with `Invalid JSON in --query` and the hint `Provide valid OpenSearch query DSL JSON`. On Windows, escape inner double quotes with backslashes; on Linux/macOS, wrap the entire value in single quotes.

### How is query opensearch different from OpenSearch Dashboards?

`query opensearch` is a CLI tool for quick, ad-hoc inspection from your terminal — checking an index exists, verifying document counts, or running a one-off search. OpenSearch Dashboards provides a full web UI with visualizations, saved queries, and interactive exploration. Use the CLI for fast debugging; use Dashboards for ongoing analytics and dashboard building.

### What happens if the OpenSearch domain is not deployed?

The command looks up the domain endpoint from the deployed stack. If the resource does not exist in the stack or the domain is not yet provisioned, the command fails with an error indicating it could not retrieve the OpenSearch endpoint. Verify the stack is deployed and the `--resource-name` matches a resource in your configuration.

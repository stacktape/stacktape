# query:opensearch

The `query:opensearch` command runs read-only queries against a deployed [OpenSearch domain](/resources/databases/opensearch) directly from your terminal. Use it to list indices, check document counts, inspect field mappings, retrieve individual documents, or search with Query DSL — without setting up a separate OpenSearch client or dashboard.

## Usage

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation indices
```

Three flags are always required: `--stage`, `--region`, and `--resourceName`. The `--resourceName` must match an OpenSearch domain resource defined in your Stacktape configuration. Additional flags depend on the operation.

## Operations

The `--operation` flag selects what kind of query to run. Five operations are available: `indices`, `mapping`, `count`, `get`, and `search`. If omitted, the command defaults to `indices`.

### indices

Lists all indices in the OpenSearch domain. This is the default operation and the best starting point when exploring an unfamiliar domain. No additional flags are needed.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation indices
```

### mapping

Returns the field mapping for a specific index — useful for understanding the index schema before writing search queries. Requires `--index`.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation mapping --index users
```

### count

Returns the document count. You can pass `--index` to count documents in a specific index; omit it to count across all indices.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation count --index orders
```

Count across the entire domain (no `--index`):

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation count
```

### get

Retrieves a single document by ID. Requires both `--index` and `--id`.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation get --index users --id doc123
```

### search

Runs an OpenSearch Query DSL search. Requires `--query` with a valid JSON string. You can optionally scope the search to a specific index with `--index` and control result count with `--limit` (defaults to 10).

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation search --query "{\"match_all\": {}}"
```

Search within a specific index with a limited result set:

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation search --index users --query "{\"match\": {\"name\": \"alice\"}}" --limit 5
```


> **Info:** The `--query` flag accepts [OpenSearch Query DSL](https://opensearch.org/docs/latest/query-dsl/) as a JSON string. The command parses the JSON before sending it — malformed JSON is rejected with `Invalid JSON in --query` and the hint `Provide valid OpenSearch query DSL JSON`. On Windows, escape inner double quotes with backslashes. On Linux/macOS, wrap the entire value in single quotes.


## Agent mode

When running with `--agent`, the command prints a structured JSON object containing `ok`, `resource`, `operation`, and the operation result. This makes it suitable for programmatic consumption by AI coding assistants and automation scripts.

```bash
stacktape query:opensearch --agent --stage prod --region eu-west-1 --resourceName mySearch --operation indices
```

For automation, prefer `--agent`. The global `--outputFormat` flag is documented in the flags reference below.

## Flags reference

<CliCommandsApiReference command="query:opensearch" sortedArgs={[
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
    "name": "resourceName",
    "required": true,
    "alias": "rn",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Resource Name</p>\n",
    "longDescription": "<p>The name of the resource as defined in your Stacktape configuration.</p>\n"
  },
  {
    "name": "stage",
    "required": true,
    "alias": "s",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stage</p>\n",
    "longDescription": "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
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
    "name": "configPath",
    "required": false,
    "alias": "cp",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Config File Path</p>\n",
    "longDescription": "<p>The path to your Stacktape configuration file, relative to the current working directory.</p>\n"
  },
  {
    "name": "currentWorkingDirectory",
    "required": false,
    "alias": "cwd",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Current Working Directory</p>\n",
    "longDescription": "<p>The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.</p>\n"
  },
  {
    "name": "help",
    "required": false,
    "alias": "h",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Show Help</p>\n",
    "longDescription": "<p>If provided, the command will not execute and will instead print help information.</p>\n"
  },
  {
    "name": "id",
    "required": false,
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Document ID</p>\n",
    "longDescription": "<p>ID of the document to retrieve (for OpenSearch get operation).</p>\n"
  },
  {
    "name": "index",
    "required": false,
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Database Index</p>\n",
    "longDescription": "<p>Index name. For DynamoDB: secondary index to query. For OpenSearch: index to search.</p>\n"
  },
  {
    "name": "limit",
    "required": false,
    "alias": "lim",
    "allowedTypes": [
      "number"
    ],
    "shortDescription": "<p> Limit</p>\n",
    "longDescription": "<p>Maximum number of items to return.</p>\n"
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
    "name": "operation",
    "required": false,
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Database Operation</p>\n",
    "longDescription": "<p>The operation to perform (varies by database type).</p>\n"
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
    "name": "profile",
    "required": false,
    "alias": "p",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Profile</p>\n",
    "longDescription": "<p>The AWS profile to use for the command. You can manage profiles using the <code>aws-profile:*</code> commands and set a default profile with <code>defaults:configure</code>.</p>\n"
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
    "name": "query",
    "required": false,
    "alias": "q",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> OpenSearch Query</p>\n",
    "longDescription": "<p>OpenSearch Query DSL as a JSON string. Example: '{\"match_all\": {}}'</p>\n"
  },
  {
    "name": "templateId",
    "required": false,
    "alias": "ti",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Template ID</p>\n",
    "longDescription": "<p>The ID of the template to download. You can find a list of available templates on the <a href=\"https://console.stacktape.com/templates\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Config Builder page</a>.</p>\n"
  }
]} />

## Examples

### Check what indices exist

Start here when exploring an unfamiliar OpenSearch domain. The `indices` operation is the default, so `--operation` can be omitted.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch
```

### Inspect field mappings for an index

Useful for understanding the schema before writing search queries.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation mapping --index products
```

### Count all documents in the domain

Omit `--index` to get a total count across every index.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation count
```

### Count documents in a specific index

Pass `--index` to scope the count.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation count --index orders
```

### Retrieve a specific document by ID

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation get --index users --id user-42
```

### Run a full-text search

The `--query` flag takes OpenSearch Query DSL as a JSON string. This example searches for error-level log entries across the `logs` index.

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation search --index logs --query "{\"match\": {\"level\": \"error\"}}" --limit 20
```

### Match all documents in an index

```bash
stacktape query:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation search --index products --query "{\"match_all\": {}}" --limit 50
```

### Use agent mode for automation

Parse the JSON result programmatically in a CI pipeline or AI coding assistant.

```bash
stacktape query:opensearch --agent --stage prod --region eu-west-1 --resourceName mySearch --operation count --index users
```

## Related commands

- [`query:sql`](/cli/query-sql) — run read-only SQL queries against a deployed relational database.
- [`query:dynamodb`](/cli/query-dynamodb) — query a deployed DynamoDB table.
- [`query:redis`](/cli/query-redis) — query a deployed Redis cluster.
- [`aws:call`](/cli/aws-call) — execute read-only AWS SDK commands against any deployed resource.
- [`logs`](/cli/logs) — fetch and analyze logs from deployed resources.

## FAQ

### Which flags does each operation require?

The `mapping` operation requires `--index`. The `get` operation requires both `--index` and `--id`. The `search` operation requires `--query`. For `indices`, no additional flags are needed. For `count`, `--index` is optional — omit it to count across all indices.

### Do I need a bastion host to query OpenSearch?

No. The command reads the deployed domain endpoint from the stack, connects over HTTPS, and authenticates using debug-agent credentials when available or your configured AWS credentials otherwise. Unlike [`query:sql`](/cli/query-sql) or [`query:redis`](/cli/query-redis), `query:opensearch` does not accept a `--bastionResource` flag.

### What format does the --query flag expect?

The `--query` flag accepts a JSON string containing an [OpenSearch Query DSL](https://opensearch.org/docs/latest/query-dsl/) query body. The command parses the JSON before sending it. If the JSON is malformed, the command rejects it with `Invalid JSON in --query` and the hint `Provide valid OpenSearch query DSL JSON`. On Windows, escape inner double quotes with backslashes; on Linux/macOS, wrap the entire value in single quotes.

### How is query:opensearch different from OpenSearch Dashboards?

`query:opensearch` is a CLI tool for quick, ad-hoc inspection from your terminal — checking an index exists, verifying document counts, or running a one-off search. OpenSearch Dashboards provides a full web UI with visualizations, saved queries, and interactive exploration. Use the CLI for fast debugging; use Dashboards for ongoing analytics and dashboard building.

### What happens if the OpenSearch domain is not deployed?

The command looks up the domain endpoint from the deployed stack. If the resource does not exist in the stack or the domain is not yet provisioned, the command fails with an error indicating it could not retrieve the OpenSearch endpoint. Verify the stack is deployed and the `--resourceName` matches a resource in your configuration.

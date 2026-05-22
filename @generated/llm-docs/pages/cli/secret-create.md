# secret:create

The `secret:create` command stores a secret in AWS Secrets Manager in a specified region. Once created, the secret can be referenced in your Stacktape configuration using the [`$Secret('secret-name')`](/configuration/directives) directive — for example, as a database password, an API key, or a third-party token.

## Usage

```bash
stacktape secret:create --region eu-west-1
```

This launches an interactive wizard that prompts for a secret name and value. You can type the value directly or load it from a file.

### Non-interactive usage

When running in CI pipelines or from AI coding agents, pass all values as flags. The `--region` flag is always required. In agent mode (`--agent`), you must also provide `--secretName` and either `--secretValue` or `--secretFile`. If both `--secretFile` and `--secretValue` are provided, the command uses `--secretFile` and ignores `--secretValue`. To overwrite an existing secret without error, add `--forceUpdate`.

Create a secret with an inline value:

```bash
stacktape secret:create --region eu-west-1 --agent --secretName MY_API_KEY --secretValue sk-abc123
```

Create a secret from a file (the file contents are stored as JSON):

```bash
stacktape secret:create --region eu-west-1 --agent --secretName SERVICE_ACCOUNT --secretFile ./credentials.json
```

## Updating an existing secret

If a secret with the given name already exists in the same region, the behavior depends on the mode:

- **Interactive mode** — Stacktape asks whether you want to update the existing secret's value. Choosing "no" aborts without changes.
- **Agent mode** — the command fails with an error unless you pass `--forceUpdate`. With `--forceUpdate`, the existing secret is overwritten silently.

```bash
stacktape secret:create --region eu-west-1 --agent --secretName MY_API_KEY --secretValue sk-new-value --forceUpdate
```

## Using secrets in your configuration

After creating a secret, reference it in your Stacktape configuration with the [`$Secret('secret-name')`](/configuration/directives) directive. For full details on how directives work, see [Directives](/configuration/directives). For managing secrets in the Stacktape Console, see [Secrets](/configuration/secrets).


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    environment: [
      {
        name: 'STRIPE_SECRET_KEY',
        value: "$Secret('stripe-secret-key')"
      }
    ]
  });

  return { resources: { api } };
});
```


## Flags reference


## CLI Options: `stacktape secret:create`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--forceUpdate (-fu)` | no | `boolean` | Force Update If the secret already exists, update it without prompting for confirmation. | - |
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
| `--secretFile (-secf)` | no | `string` | Secret File Path to a file whose contents will be stored as the secret value. | - |
| `--secretName (-secn)` | no | `string` | Secret Name The name of the secret in AWS Secrets Manager. | - |
| `--secretValue (-secv)` | no | `string` | Secret Value The value to store in the secret. For sensitive values, consider using --secretFile instead. | - |


## Examples

### Store a database password

```bash
stacktape secret:create --region us-east-1 --agent --secretName DB_PASSWORD --secretValue "p@ssw0rd-here"
```

### Store a multi-line service account JSON from a file

```bash
stacktape secret:create --region eu-west-1 --agent --secretName GCP_SERVICE_ACCOUNT --secretFile ./gcp-sa.json
```

### Rotate a secret in CI

Use `--forceUpdate` to overwrite the existing value without prompting.

```bash
stacktape secret:create --region eu-west-1 --agent --secretName DEPLOY_TOKEN --secretValue "$NEW_TOKEN" --forceUpdate
```


> **Info:** Updating a secret changes the value stored in AWS Secrets Manager. To apply the updated value to running resources, run [`deploy`](/cli/deploy) after changing the secret.


## FAQ

### Where is the secret stored?

The `secret:create` command stores your secret in AWS Secrets Manager in the region you specify with `--region`. Each secret is identified by its name and is region-scoped — the same name in different regions creates separate secrets. You can view and manage stored secrets in the AWS Secrets Manager console or through the [Stacktape Console](/stacktape-console/console-overview).

### How do I use a secret in my Stacktape configuration?

Reference a stored secret with the `$Secret('secret-name')` [directive](/configuration/directives). The directive can be used anywhere a string value is accepted in your Stacktape config — environment variables, database passwords, third-party API keys. The secret name you pass to `$Secret()` must match the `--secretName` you used when creating it.

### Can I update a secret without redeploying?

Yes. Running `secret:create` with `--forceUpdate` updates the value in AWS Secrets Manager immediately. However, running resources that received the old value at deploy time will not automatically pick up the change. Run [`deploy`](/cli/deploy) to propagate the updated secret to your stack's resources.

### How much does AWS Secrets Manager cost?

AWS Secrets Manager charges per secret per month (approximately $0.40/secret/month) plus a small per-API-call fee ($0.05 per 10,000 calls). For most projects with a handful of secrets, the cost is under $5/month. There is no free tier for Secrets Manager storage.

### What is the difference between interactive and agent mode?

Interactive mode (the default) walks you through a guided wizard — it prompts for the secret name, value source, and confirmation. Agent mode (`--agent`) disables all prompts, requires all values as flags, and outputs structured JSONL. Use agent mode in CI pipelines, with AI coding agents, or any non-interactive context.

### Can I store binary files as secrets?

The `--secretFile` flag reads the file and stores its contents as a JSON-serialized string. This works well for JSON credentials files, PEM certificates, and other text-based secrets. For large binary blobs, consider storing the file in [S3](/resources/storage/s3-bucket) and keeping only the S3 path as a secret.

### How do I delete a secret?

Use [`secret:delete`](/cli/secret-delete) to remove a secret from AWS Secrets Manager. Make sure no deployed resources reference the secret via `$Secret()` before deleting, or the next deployment will fail to resolve the directive.

### Is secret:create idempotent?

Not by default. If a secret with the same name already exists, the command fails in agent mode and prompts in interactive mode. Pass `--forceUpdate` in agent mode to make it idempotent — the command will create or update the secret without error regardless of whether it already exists.

## Related commands

- [`secret:get`](/cli/secret-get) — retrieve and display a secret's current value and metadata.
- [`secret:delete`](/cli/secret-delete) — delete a secret from AWS Secrets Manager.
- [`deploy`](/cli/deploy) — deploy your stack. Resources referencing `$Secret()` resolve the secret value during deployment.

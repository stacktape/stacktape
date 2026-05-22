# Secrets

Stacktape secrets are sensitive values — API keys, database passwords, tokens — stored in AWS Secrets Manager and
referenced in your `stacktape.ts` using the `$Secret()` [directive](/configuration/directives). Secret values never
appear in your config files or version control — only the `$Secret()` directive reference does, which is safe to commit.
At deploy time, Stacktape resolves each reference into a CloudFormation dynamic reference that AWS resolves when
creating or updating resources.

## Why use secrets

Hard-coding credentials in configuration files is a security risk. Even private repositories can leak through CI logs,
screenshots, or developer machines. Stacktape secrets keep sensitive values in AWS Secrets Manager — an encrypted,
audited, access-controlled store — and inject them only when your stack deploys or your workloads start.

Common values that belong in secrets:

- Database passwords
- Third-party API keys (Stripe, Twilio, SendGrid)
- OAuth client secrets
- Bot tokens (Discord, Slack)
- Encryption keys and signing secrets

## When NOT to use secrets

Not everything needs to be a secret. Keep non-sensitive configuration directly in your `stacktape.ts` or use
[variables](/configuration/variables-and-reuse):

- Public API URLs or endpoint addresses
- Feature flags and numeric thresholds
- Region names, stage identifiers, or app names
- Any value you would be comfortable seeing in a git log

AWS Secrets Manager charges ~$0.40/secret/month. If the value isn't sensitive and doesn't vary by stage, a hard-coded
config value avoids unnecessary cost and complexity.

## Creating secrets

You can create secrets from the Stacktape Console or the CLI. Both store the value in AWS Secrets Manager in the
selected AWS region.

### Using the Stacktape Console

The Secrets page in the [Stacktape Console](/stacktape-console/console-overview) lets you create, view, edit, and
delete secrets. Select an AWS account and region, then use the **Create new secret** button to open the creation form.

The page lists secrets with their name, last accessed date, created date, updated date, and description. Sorting is
available on all columns, and pagination handles large secret lists. Each secret row provides actions to view its value,
edit it, or delete it.


> Screenshot: Stacktape Console Secrets page showing a table of secrets with name, date columns, description, and action icons for view, edit, and delete Caption: Manage secrets per AWS account and region in the Stacktape Console.


### Using the CLI

Create a secret with [`stacktape secret:create`](/cli/secret-create).

In interactive mode, the CLI prompts for the secret name and value:

```bash
stacktape secret:create --region eu-west-1
```

For non-interactive use (CI/CD pipelines), pass the values directly:

```bash
stacktape secret:create --region eu-west-1 --secretName my-api-key --secretValue sk_live_abc123
```

See [`stacktape secret:create --help`](/cli/secret-create) for all available flags and options.

## Referencing secrets with $Secret()

The `$Secret()` [directive](/configuration/directives) references a secret by name. During deployment, Stacktape
fetches the secret from AWS Secrets Manager, records its current version ID, and inserts a CloudFormation dynamic
reference (`{{resolve:secretsmanager:...}}`) into the template. The actual secret value never appears in the
CloudFormation template — AWS resolves it at resource creation time.

Use `$Secret()` in Stacktape config properties that map to CloudFormation resource properties supporting dynamic
references — most commonly workload environment variables and database credential fields.

### Basic usage

Import `$Secret` from `stacktape` and use it as a value in your config. This example injects a Discord bot token into
a [worker service](/resources/compute/worker-service) as an environment variable:


Example (TypeScript):

```typescript
import { $Secret, WorkerService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const bot = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    environment: {
      DISCORD_BOT_TOKEN: $Secret('discord-bot-token')
    }
  });

  return {
    resources: { bot }
  };
});
```


Your application code reads the value from the environment variable — `process.env.DISCORD_BOT_TOKEN`. The secret
named `discord-bot-token` must exist in AWS Secrets Manager in the deployment region before you deploy. If it does not
exist, the deployment fails with an error and a hint to create it using
[`stacktape secret:create`](/cli/secret-create).

### JSON secrets with dot notation

When a secret stores a JSON object, extract a specific key using dot notation: `$Secret('secretName.keyName')`. This
is useful for database credentials where a single secret holds multiple related fields.


Example (TypeScript):

```typescript
import {
  $Secret,
  RelationalDatabase,
  RdsEnginePostgres,
  WebService,
  StacktapeImageBuildpackPackaging,
  defineConfig
} from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: $Secret('mainDatabase.password')
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    })
  });

  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/index.ts'
    }),
    resources: { cpu: 0.25, memory: 512 },
    connectTo: [mainDatabase]
  });

  return {
    resources: { mainDatabase, api }
  };
});
```


In this example, `$Secret('mainDatabase.password')` reads the `password` key from a JSON secret named `mainDatabase`.
The secret value in AWS Secrets Manager would look like:

```json
{ "password": "my-db-password-here" }
```


> **Warning:** If you use dot notation on a secret that is not valid JSON, or reference a key that does not exist in the JSON object,
the deployment fails with a descriptive error. The error names both the secret and the missing key.


## How $Secret() resolution works

The `$Secret()` directive resolves in two phases depending on the command context: deploy time and dev mode.

**At deploy time**, Stacktape fetches the secret from AWS Secrets Manager, records the current version ID as a
CloudFormation stack output, and inserts a dynamic reference (`{{resolve:secretsmanager:secretName:SecretString:jsonKey::versionId}}`)
into the template. AWS CloudFormation resolves the actual value when creating or updating the resource. The secret
value never appears in the CloudFormation template itself — only the reference string does.

**In [dev mode](/local-development/dev-mode-overview)** (`stacktape dev`), `$Secret()` fetches the secret value
directly from AWS Secrets Manager and injects it into your local workload's environment. If a deployed stack exists
for the current project and stage, the directive uses the version that was pinned during the last deployment. If no
stack has been deployed yet, it fetches the latest version.

**Version pinning**: Each deployment pins to the secret version that was current at deploy time. If someone updates
the secret value between deployments, running workloads continue using the pinned version until the next redeployment.
This means updating a secret requires a redeploy to take effect in running workloads.

## Retrieving and managing secrets

Stacktape provides CLI commands and Console actions for reading, updating, and deleting secrets in AWS Secrets Manager.
The operations below apply to any secret in the selected region, whether created through Stacktape or directly in AWS.

### View a secret value

Use [`stacktape secret:get`](/cli/secret-get) to retrieve a secret's current value:

```bash
stacktape secret:get --region eu-west-1 --secretName my-api-key
```

In the Stacktape Console, click the **view** action (eye icon) next to a secret to reveal its value.

### Update a secret

In the Console, click the **edit** action next to a secret to update its value or description. From the CLI, see
[`stacktape secret:create`](/cli/secret-create) for options to update an existing secret.


> **Info:** After updating a secret, redeploy the stack for workloads to pick up the new value. The `$Secret()` directive pins to
a specific secret version at deploy time, so running workloads continue using the version from the last deployment
until you redeploy.


### Delete a secret

Use [`stacktape secret:delete`](/cli/secret-delete) to remove a secret:

```bash
stacktape secret:delete --region eu-west-1 --secretName my-api-key
```

In the Console, click the **delete** action next to a secret.


> **Warning:** Do not delete secrets that are referenced by active stacks. The next deployment that references the missing secret
will fail because the dynamic reference cannot resolve. Remove the `$Secret()` reference from your config and
redeploy before deleting the secret, or delete the stack first.


## Secrets vs $SsmParam()

Stacktape provides two directives for referencing externally stored sensitive values. `$Secret()` reads from AWS
Secrets Manager. `$SsmParam()` reads from AWS Systems Manager Parameter Store and uses CloudFormation `ssm-secure`
dynamic references for SecureString parameters, or `ssm` references for standard String parameters. Both are
[directives](/configuration/directives).


## Feature Comparison

| Feature | $Secret() | $SsmParam() |
| --- | --- | --- |
| Backing store | AWS Secrets Manager | AWS SSM Parameter Store |
| JSON key extraction | yes | no |
| Encryption | Always encrypted (KMS) | SecureString type uses KMS |
| CF dynamic reference type | secretsmanager | ssm / ssm-secure |
| Version pinning | Pins to VersionId | Pins to Version number |
| Best for | Passwords, API keys, tokens | Existing SSM parameters |


Use `$Secret()` for most sensitive values — it is the default path for credentials in Stacktape. Use `$SsmParam()`
when you already have parameters stored in AWS Systems Manager Parameter Store, or when you need to reference
non-secret configuration values from Parameter Store that are shared across multiple stacks.

## FAQ

### How are secrets encrypted?

AWS Secrets Manager encrypts secrets at rest using AWS KMS. Each secret is encrypted with either the AWS-managed
default key or a customer-managed KMS key. All API calls use TLS in transit. Stacktape does not add a separate
encryption layer — it relies on the encryption built into AWS Secrets Manager.

### Can I share secrets across stages?

Yes. Secrets in AWS Secrets Manager are independent of Stacktape stacks. If you create a secret called `stripe-key` in
`eu-west-1`, every stack deployed to that region can reference it with `$Secret('stripe-key')`. Use naming conventions
like `production-stripe-key` and `staging-stripe-key` if you need stage-specific values.

### What happens if a referenced secret does not exist?

The deployment fails with an error naming the missing secret and a hint suggesting you create it using
[`stacktape secret:create`](/cli/secret-create). Create all referenced secrets in the deployment region before running
`stacktape deploy`.

### Can I use $Secret() in environment variables for Lambda functions?

Yes. `$Secret()` works in the `environment` property of [Lambda functions](/resources/compute/lambda-function),
[web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service),
[batch jobs](/resources/compute/batch-job), [multi-container workloads](/resources/compute/multi-container-workload),
and all SSR frontend resources. Any config property that maps to a CloudFormation resource property supporting dynamic
references can accept `$Secret()`.

### How much does AWS Secrets Manager cost?

AWS Secrets Manager charges ~$0.40 per secret per month and $0.05 per 10,000 API calls. A typical project with 5-10
secrets costs under $5/month. There is no free tier for Secrets Manager storage, but the API call volume from normal
Stacktape deployments is minimal.

### How do I list all secrets in a region?

Use the Stacktape Console's Secrets page. Select an AWS account and region to browse all secrets with sorting and
pagination. From the CLI, use [`stacktape secret:get`](/cli/secret-get) to retrieve a specific secret by name when
you already know its identifier.

### When should I use secrets vs hard-coded config values?

Use secrets for any value that is sensitive, varies by stage, or should not appear in version control. Database
passwords, API keys, OAuth secrets, and webhook signing keys all belong in secrets. Non-sensitive configuration like
feature flags, public API URLs, or numeric thresholds can stay in your `stacktape.ts` directly or use
[variables](/configuration/variables-and-reuse).

### Can I rotate secrets automatically?

AWS Secrets Manager supports automatic rotation via Lambda functions, but Stacktape does not configure rotation
automatically. You can set up rotation directly in the AWS Console or through
[CloudFormation overrides](/configuration/overrides-and-escape-hatches). After rotation, redeploy your stack so
workloads pick up the new secret version — `$Secret()` pins to the version from the last deployment.

### Do secrets work in dev mode?

Yes. When you run [`stacktape dev`](/local-development/dev-mode-overview), the `$Secret()` directive fetches the
secret value from AWS Secrets Manager and injects it into your local workload's environment. If a deployed stack
exists for the project and stage, it uses the pinned version from the last deployment. If no stack has been deployed,
it fetches the latest version.

### What is the difference between AWS Secrets Manager and SSM Parameter Store?

AWS Secrets Manager is purpose-built for secrets: it offers built-in rotation, per-secret access policies, and
automatic encryption with KMS. SSM Parameter Store is a broader key-value store that supports SecureString parameters
encrypted with KMS, but does not include built-in rotation or JSON key extraction. Secrets Manager costs
~$0.40/secret/month; SSM Parameter Store's standard tier is free for up to 10,000 parameters. Choose Secrets Manager
(via `$Secret()`) for credentials and API keys. Choose Parameter Store (via `$SsmParam()`) for existing parameters or
shared configuration values.

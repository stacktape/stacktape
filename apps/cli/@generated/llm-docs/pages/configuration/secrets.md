# Secrets

Stacktape secrets are sensitive values — API keys, database passwords, tokens — stored in AWS Secrets Manager and
referenced in your `stacktape.ts` using the `$Secret()` [directive](/configuration/directives). When you use
`$Secret()`, your Stacktape config contains only the directive reference, so you do not need to commit the actual
secret value.
At deploy time, Stacktape resolves each reference into a CloudFormation dynamic reference that AWS resolves when
creating or updating resources.

## Why use secrets

Hard-coding credentials in configuration files is a security risk. Even private repositories can leak through CI logs,
screenshots, or developer machines. The `$Secret()` directive references values stored in AWS Secrets Manager — an
encrypted, audited, access-controlled store. At deploy time, Stacktape resolves each `$Secret()` into a CloudFormation
dynamic reference; in [dev mode](/local-development/dev-mode-overview), it calls AWS Secrets Manager directly.

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

AWS Secrets Manager has a per-secret monthly storage cost and per-API-call charges — avoid using it for non-sensitive
values where a hard-coded config value would work without added cost or complexity.

## Creating secrets

You can create secrets from the Stacktape Console or the CLI. The Console Secrets page works per AWS account and
AWS region — the list request passes the selected region to AWS Secrets Manager.

### Using the Stacktape Console

The Secrets page in the [Stacktape Console](/stacktape-console/console-overview) lets you create, view, edit, and
delete secrets. Select an AWS account and region, then click **Create new secret** to open the creation modal.

The page lists secrets with their name, last accessed date, created date, updated date, and description. Sorting is
available on all columns, and pagination handles large secret lists. Each secret row provides actions to view its value,
edit it, or delete it.


> Screenshot: Stacktape Console Secrets page showing a table of secrets with name, date columns, description, and action icons for view, edit, and delete Caption: Manage secrets per AWS account and region in the Stacktape Console.


### Using the CLI

The CLI also provides a [`stacktape secret:set`](/cli/secret-set) command for creating secrets from the
terminal. See the [`secret:set` CLI reference](/cli/secret-set) for supported options.

## Referencing secrets with $Secret()

The `$Secret()` [directive](/configuration/directives) references a secret by name. During deployment, Stacktape
fetches the secret from AWS Secrets Manager, records its current version ID, and inserts a CloudFormation dynamic
reference (`{{resolve:secretsmanager:...}}`) into the template. The actual secret value never appears in the
CloudFormation template — AWS resolves it at resource creation time.

`$Secret()` resolves to a CloudFormation dynamic reference at deploy time. It is commonly used in workload
environment variables and database credential fields — config properties that accept runtime
[directives](/configuration/directives).

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
named `discord-bot-token` must be fetchable by Stacktape before deployment. If it cannot be fetched, the deployment
fails with an error and a hint to create it using [`stacktape secret:set`](/cli/secret-set).

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


> **Warning:** Dot notation requires the secret value to be valid JSON. If the value is not valid JSON, or the selected key does
not resolve to a truthy value, the deployment fails with a descriptive error.


## How $Secret() resolution works

The `$Secret()` directive resolves in two phases depending on the command context: deploy time and dev mode.

**At deploy time**, Stacktape fetches the secret from AWS Secrets Manager, records the current version ID as a
CloudFormation stack output, and inserts a dynamic reference (`{{resolve:secretsmanager:secretName:SecretString:jsonKey::versionId}}`)
into the template. AWS CloudFormation resolves the actual value when creating or updating the resource. The secret
value never appears in the CloudFormation template itself — only the reference string does.

**In [dev mode](/local-development/dev-mode-overview)** (`stacktape dev`), `$Secret()` resolves the secret value
by calling AWS Secrets Manager. When the current stack has a recorded `CurrentSecretVersionId` output from a prior
deployment, Stacktape passes that version ID to Secrets Manager to fetch the pinned version.

**Version pinning**: Each deployment pins to the secret version that was current at deploy time. If someone updates
the secret value between deployments, running workloads continue using the pinned version until the next redeployment.
This means updating a secret requires a redeploy to take effect in running workloads.

## Retrieving and managing secrets

Stacktape provides CLI commands and Console actions for reading, updating, and deleting secrets in AWS Secrets Manager.
The Secrets page in the Console lists AWS Secrets Manager secrets in the selected AWS account and region.

### View a secret value

The CLI provides [`stacktape secret:get`](/cli/secret-get) for retrieving a secret's current value. See the
[`secret:get` CLI reference](/cli/secret-get) for supported options.

In the Stacktape Console, click the **view** action (eye icon) next to a secret to reveal its value.

### Update a secret

In the Console, click the **edit** action next to a secret to open the update modal.


> **Info:** After updating a secret, redeploy the stack for workloads to pick up the new value. The `$Secret()` directive pins to
a specific secret version at deploy time, so running workloads continue using the version from the last deployment
until you redeploy.


### Delete a secret

The CLI provides [`stacktape secret:delete`](/cli/secret-delete) for removing secrets. See the
[`secret:delete` CLI reference](/cli/secret-delete) for supported options.

In the Console, click the **delete** action next to a secret.


> **Warning:** Do not delete secrets that are referenced by active stacks. The next deployment that references the missing secret
will fail because the dynamic reference cannot resolve. Remove the `$Secret()` reference from your config and
redeploy before deleting the secret, or delete the stack first.


## Secrets vs $SsmParam()

Stacktape provides `$Secret()` for AWS Secrets Manager and `$SsmParam()` for AWS Systems Manager Parameter Store. Use
this comparison when deciding where to keep sensitive or externally managed configuration values. `$SsmParam()` uses
CloudFormation `ssm-secure` dynamic references for SecureString parameters, or `ssm` references for standard String
parameters. Both are [directives](/configuration/directives).


## Feature Comparison

| Feature | $Secret() | $SsmParam() |
| --- | --- | --- |
| Backing store | AWS Secrets Manager | AWS SSM Parameter Store |
| JSON key extraction (dot notation) | yes | Not implemented |
| Encryption | Always encrypted (KMS) | SecureString type uses KMS |
| CF dynamic reference type | secretsmanager | ssm / ssm-secure |
| Version pinning | Pins to VersionId | Pins to Version number |


Use `$Secret()` for most Stacktape-managed credentials and API keys, especially when you want AWS Secrets Manager
as the backing store. Use `$SsmParam()`
when you already have parameters stored in AWS Systems Manager Parameter Store, or when you need to reference
non-secret configuration values from Parameter Store that are shared across multiple stacks.

## FAQ

### Can I share secrets across stages?

Yes. Secrets in AWS Secrets Manager are independent of Stacktape stacks. If you create a secret called `stripe-key` in
`eu-west-1`, every stack deployed to that region can reference it with `$Secret('stripe-key')`. Use naming conventions
like `production-stripe-key` and `staging-stripe-key` if you need stage-specific values.

### What happens if a referenced secret does not exist?

The deployment fails with an error naming the missing secret and a hint suggesting you create it using
[`stacktape secret:set`](/cli/secret-set). Create all referenced secrets in the deployment region before running
`stacktape deploy`.

### Where can I use $Secret() in my config?

`$Secret()` resolves to a CloudFormation dynamic reference at deploy time, so it works in any config property that
accepts runtime directives. It is most commonly used in workload environment variables and database credential
fields, across [Lambda functions](/resources/compute/lambda-function),
[web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service),
[batch jobs](/resources/compute/batch-job), and
[multi-container workloads](/resources/compute/multi-container-workload).

### How much does AWS Secrets Manager cost?

AWS Secrets Manager charges a per-secret monthly storage fee and a per-API-call fee. A typical Stacktape project with
a handful of secrets incurs minimal cost. See the
[AWS Secrets Manager pricing page](https://aws.amazon.com/secrets-manager/pricing/) for current rates.

### Why do my workloads still use the old secret value after I updated it?

`$Secret()` pins to the secret version that was current at deploy time, so updating the value in AWS Secrets Manager
does not affect running workloads on its own. Redeploy the stack to pin to and roll out the new version.

### Can I rotate secrets automatically?

AWS Secrets Manager supports automatic rotation via Lambda functions, but Stacktape does not configure rotation
automatically. You can set up rotation directly in the AWS Console. After rotation, redeploy your stack so workloads
pick up the new secret version — `$Secret()` pins to the version from the last deployment.

# Stages and Environments

A Stacktape stage is a named deployment of your project — such as `dev`, `staging`, or `production`. Each stage creates
a fully isolated set of AWS resources under its own CloudFormation stack. One codebase, multiple stages: develop against
cheap resources, test against a staging replica, and deploy production with full redundancy — all from the same
configuration file.

## Why stages exist

Most teams need at least two separate copies of their infrastructure: one for development and one for production.
Without stages, you'd maintain parallel config files, duplicate resources manually, or rely on brittle naming
conventions. Stages solve this by making the environment a first-class parameter of your configuration. You write one
`stacktape.ts`, branch on the `stage` value where sizing, secrets, or features differ, and let Stacktape create fully
independent stacks per stage.

Because every stage produces its own CloudFormation stack with its own resources, a development deploy does not touch
production databases, functions, or storage — each stage's resources are independently provisioned. Stages can fit CI/CD workflows; for example, a team might deploy `main` to `production` and feature branches to short-lived stages.

## How stages work

### Stack naming

Stacktape derives the CloudFormation stack name from your project name and stage:

```
{projectName}-{stage}
```

A project named `my-api` deployed to stage `dev` creates a stack called `my-api-dev`. The same project deployed to
`production` creates `my-api-production`. Each stage creates a separate CloudFormation stack with separately provisioned resources — databases, Lambda functions, queues, and storage are all independent between stages.

### Stage name constraints

Stage names are limited to 12 characters and should contain only alphanumeric characters and hyphens. Examples of valid stage names: `dev`, `staging`, `production`, `pr-42`, `dev-john`.


> **Warning:** Keep stage names short. The combined project name + stage forms the CloudFormation stack name. If the combination is
  too long, Stacktape will obfuscate some internal resource names, which makes debugging harder.


### Deploying a stage

Pass the `--stage` flag to [`stacktape deploy`](/cli/deploy) to target a specific stage.

Deploy a development stage:

```bash
stacktape deploy --stage dev --region eu-west-1
```

Deploy production:

```bash
stacktape deploy --stage production --region eu-west-1
```

Each command creates (or updates) a completely separate CloudFormation stack with its own resources. Deleting a stage
removes only that stage's resources — other stages are unaffected.

## Stage-aware configuration

The `defineConfig` callback receives a `stage` parameter. Use standard TypeScript logic — conditionals, lookup objects, helper functions — to vary your config per stage.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  RelationalDatabase,
  RdsEnginePostgres,
  $Secret
} from 'stacktape';
export default defineConfig(({ stage }) => {
  const isProduction = stage === 'production';

  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: isProduction ? 'db.t4g.medium' : 'db.t4g.micro',
        multiAz: isProduction
      }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password-' + stage)
    }
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: isProduction ? 1024 : 256,
    timeout: isProduction ? 30 : 10,
    environment: {
      LOG_LEVEL: isProduction ? 'warn' : 'debug'
    },
    connectTo: [database]
  });

  return { resources: { database, api } };
});
```


In this example, the production stage gets a larger database instance with multi-AZ redundancy, more Lambda memory, and
tighter log levels — while development stages use minimal resources to keep costs low. The `$Secret` directive
can reference a different secret name per stage, such as `db-password-dev` and `db-password-production`, when you
create separate secrets for those stages. See [Secrets](/configuration/secrets) for how to create and manage secrets.

### Config callback parameters

The `defineConfig` callback receives an object whose `stage` property is the stage name passed via `--stage`. See the [configuration files](/configuration/configuration-files) page for the full `defineConfig` API and any other properties exposed on the callback object.

### Using $Stage() in directives

When composing directive strings that need the stage value at deploy time (rather than at config-evaluation time), use
the [`$Stage()` directive](/configuration/directives). This is mainly useful in YAML configs or when building
CloudFormation-level expressions. In TypeScript configs, you can typically use the `stage` parameter directly since it's
already available as a JavaScript variable.

## Common patterns

### Multi-tier environments

Most production teams use three tiers: `dev` for daily work, `staging` for pre-release validation, and `production` for
live traffic. Use a lookup object to map each stage to its resource configuration.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  StacktapeImageBuildpackPackaging,
  RelationalDatabase,
  RdsEnginePostgres,
  $Secret
} from 'stacktape';
export default defineConfig(({ stage }) => {
  const tiers: Record<
    string,
    { instanceSize: string; minInstances: number; maxInstances: number; multiAz: boolean }
  > = {
    dev: { instanceSize: 'db.t4g.micro', minInstances: 1, maxInstances: 1, multiAz: false },
    staging: { instanceSize: 'db.t4g.small', minInstances: 1, maxInstances: 3, multiAz: false },
    production: { instanceSize: 'db.t4g.medium', minInstances: 2, maxInstances: 10, multiAz: true }
  };
  const tier = tiers[stage] || tiers.dev;

  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: tier.instanceSize,
        multiAz: tier.multiAz
      }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password-' + stage)
    }
  });

  const app = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/app.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    scaling: { minInstances: tier.minInstances, maxInstances: tier.maxInstances },
    connectTo: [database]
  });

  return { resources: { database, app } };
});
```


The fallback `tiers[stage] || tiers.dev` means any unrecognized stage name (like `feat-xyz`) inherits the `dev`
tier. This keeps feature branch stages cheap by default.

### Feature branch stages

Create a temporary stage for any feature branch. Deploy it, test it, and delete it when the branch merges.

Deploy a feature branch stage:

```bash
stacktape deploy --stage feat-42 --region eu-west-1
```

Delete the stage after the branch merges:

```bash
stacktape delete --stage feat-42 --region eu-west-1
```

Feature branch stages are disposable by design. Each one gets its own database, its own API endpoint, and its own
resources. Keep stage names under 12 characters — abbreviate branch names if needed.

### Preview environments for pull requests

Stages are a good fit for per-PR preview environments. See [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) and [Stacks per git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for setup details.

## Conditional resources

Since `defineConfig` is plain TypeScript, you can conditionally include or exclude resources per stage. This is useful
for skipping expensive resources in ephemeral stages, or adding production-only safeguards like a
[web application firewall](/resources/security/web-application-firewall).


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  RelationalDatabase,
  RdsEnginePostgres,
  WebAppFirewall,
  $Secret
} from 'stacktape';
export default defineConfig(({ stage }) => {
  const resources: Record<string, any> = {};

  resources.api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
    memory: 512
  });

  if (!stage.startsWith('pr-')) {
    resources.database = new RelationalDatabase({
      engine: new RdsEnginePostgres({
        version: '16',
        primaryInstance: { instanceSize: 'db.t4g.micro' }
      }),
      credentials: {
        masterUserPassword: $Secret('db-password-' + stage)
      }
    });
  }

  if (stage === 'production') {
    resources.firewall = new WebAppFirewall({ scope: 'regional' });
  }

  return { resources };
});
```


In this example, PR preview stages skip the database entirely (the API could use an external or shared database
instead), and only production gets a WAF. This pattern keeps preview stages fast to deploy and cheap to run.

## Stage-specific secrets

Store separate Stacktape secrets for each stage. Use
[`stacktape secret:create`](/cli/secret-create) to create them, and the
[`$Secret` directive](/configuration/directives) to reference them in config.

Create separate secrets for each stage — for example, `db-password-dev` and `db-password-production` — using [`stacktape secret:create`](/cli/secret-create):

```bash
stacktape secret:create --region eu-west-1
```

Run the command once per secret. See the [CLI reference](/cli/secret-create) for available options.

Then reference the stage-specific secret in your config using the `stage` parameter:


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';
export default defineConfig(({ stage }) => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password-' + stage)
    }
  });

  return { resources: { database } };
});
```


With `stage === 'dev'`, the config passes `db-password-dev` to `$Secret`; with `stage === 'production'`, it passes `db-password-production`. Never share production secrets with development stages.
See [Secrets](/configuration/secrets) for the full guide.

## Stage-specific domains

Assign different [custom domains](/resources/networking/custom-domains) per stage to give each environment a clean URL.
Production uses the apex domain; other stages use subdomains.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(({ stage }) => {
  const gateway = new HttpApiGateway({
    customDomains:
      stage === 'production'
        ? [{ domainName: 'api.example.com' }]
        : [{ domainName: stage + '.api.example.com' }]
  });

  return { resources: { gateway } };
});
```


This produces:

| Stage | Domain |
|---|---|
| `production` | `api.example.com` |
| `staging` | `staging.api.example.com` |
| `dev` | `dev.api.example.com` |

Custom domains are managed separately. See [custom domains](/resources/networking/custom-domains) and [`stacktape domain:add`](/cli/domain-add) for setup.

## Sharing resources across stages

Sometimes you want to share certain resources (like a database) across stages. Use a separate "shared infrastructure"
project deployed as its own stack, then reference its outputs from other projects.


## Project Structure

- `my-platform`
  - `shared-infra`
    - `stacktape.ts`: Database, shared cache
  - `api`
    - `stacktape.ts`: References shared-infra outputs
  - `web`
    - `stacktape.ts`: References shared-infra outputs


The shared infrastructure project deploys resources that other projects reference:


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';
export default defineConfig(({ stage }) => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('shared-db-password-' + stage)
    }
  });

  return { resources: { database } };
});
```


A consuming project references the shared stack's outputs using the `$CfStackOutput` directive, which resolves at CloudFormation deploy time. A `$StackOutput` directive is also available for resolving values locally at config-evaluation time. The referenced stack must already be deployed. Manage shared infrastructure carefully — consuming stacks depend on its outputs. See [directives](/configuration/directives) for details on cross-stack references.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  $CfStackOutput
} from 'stacktape';
export default defineConfig(({ stage }) => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    environment: {
      DATABASE_URL: $CfStackOutput('shared-infra-' + stage, 'DatabaseConnectionString')
    }
  });

  return { resources: { api } };
});
```


This keeps a single database instance serving multiple services within the same stage, reducing cost in development while still allowing full isolation between stages. See [directives](/configuration/directives) for more about cross-stack references.

## Setting defaults

If you always deploy to the same stage and region during development, use [`stacktape defaults:configure`](/cli/defaults-configure) to set default values for stage and region. See the [CLI reference](/cli/defaults-configure) for details.

```bash
stacktape defaults:configure
```

Once configured, you can deploy without passing `--stage` and `--region`:

```bash
stacktape deploy
```

Override the defaults when deploying to a different stage:

```bash
stacktape deploy --stage production --region us-east-1
```

## Managing deployed stages

### Listing stacks

Use [`stacktape info:stacks`](/cli/info-stacks) to list deployed stacks in a region. See the [CLI reference](/cli/info-stacks) for available options.

```bash
stacktape info:stacks --region eu-west-1
```

### Deleting a stage

Use [`stacktape delete`](/cli/delete) to delete a stage's stack.

```bash
stacktape delete --stage feat-42 --region eu-west-1
```

Deletion removes the stage's CloudFormation stack. Other stages remain completely unaffected.


> **Warning:** You cannot run `stacktape deploy` on a stage that is currently running in [dev mode](/local-development/dev-mode-overview).
  Stop dev mode first with [`stacktape dev:stop`](/cli/dev-stop), then deploy.


## Best practices

**Use consistent stage names.** Pick a naming convention — `dev`, `staging`, `production` — and stick to it across all
projects. Consistent names simplify CI/CD pipelines and make `$Secret('db-password-' + stage)` patterns predictable.

**Keep dev stages minimal.** Use the smallest instance sizes and lowest scaling in development. The multi-tier lookup
pattern shown above makes this automatic and keeps development costs low without manual intervention.

**Make staging mirror production.** The whole point of a staging stage is to catch issues before production. Use the
same instance types, same scaling ranges, and same configuration — just with test data and lower traffic.

**Separate secrets per stage.** Never reuse production credentials in development. Stage-interpolated secret names
(`db-password-dev`, `db-password-production`) enforce this by convention.

**Delete ephemeral stages promptly.** Feature branch and PR preview stages accumulate if not cleaned up. See
[GitOps with Console](/ci-cd-and-gitops/gitops-with-console) and [Stacks per git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for setting up preview-stage workflows, or manually run
[`stacktape delete`](/cli/delete).

**Add safeguards in production.** Enable multi-AZ for databases, add a
[web application firewall](/resources/security/web-application-firewall), configure
[alarms](/observability/alarms), and set [budgets](/managing-costs/budgets). Use conditional resource inclusion
to add these only in production.

## FAQ

### How do I access the stage name in my config?

The `defineConfig` callback receives an object with a `stage` property. Use standard TypeScript logic to branch on the stage value — ternary operators, lookup objects, or if statements all work. In directive strings that need the stage at CloudFormation deploy time, use the [`$Stage()` directive](/configuration/directives).

### Can I include resources only in certain stages?

Yes. Since `defineConfig` returns a plain JavaScript object, you can conditionally add keys to the `resources` object using `if` statements or any other control flow. Resources not included in the returned object are simply not created for that stage. This is commonly used to skip databases in preview stages or add WAFs only in production.

### Are stages fully isolated from each other?

Each stage creates its own CloudFormation stack with its own AWS resources — separate databases, separate Lambda functions, separate S3 buckets, and so on. Stacktape provisions each stage's resources independently and does not share data between stages unless you explicitly configure it (e.g., by referencing another stack's outputs via the [`$StackOutput` directive](/configuration/directives)). Deploying or deleting one stage has no effect on other stages.

### How do I set up automatic preview environments for pull requests?

Stages are a good fit for per-PR preview environments — each PR can deploy to its own isolated stage. See [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) and [Stacks per git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for the full setup.

### What happens when I deploy to an existing stage?

Deploying to an existing stage updates that stage's CloudFormation stack. Underneath, AWS CloudFormation computes the diff between the current and desired state and applies only the changes needed. When an update fails and auto-rollback is enabled, Stacktape deletes artifacts from the rolled-back deploy unless the error occurred during stack monitoring.

### How do I clean up unused stages?

Run [`stacktape delete --stage <name> --region <region>`](/cli/delete) to delete a stage's stack. To see what stages exist, use [`stacktape info:stacks`](/cli/info-stacks). For automated cleanup, see [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) and [Stacks per git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern).

### Should I use separate AWS accounts or separate stages for production isolation?

Stages provide strong isolation — each stage is a separate CloudFormation stack with separate resources. For most teams, this is sufficient. Separate AWS accounts add IAM-level isolation (a compromised dev credential cannot access production resources) and independent billing, but they also add operational complexity. Use separate accounts when your organization requires strict regulatory compliance or blast-radius isolation between environments.

### Can different stages use different AWS regions?

Yes. The region is a separate parameter from the stage, so you can deploy `dev` to `eu-west-1` and `production` to `us-east-1`. The stack name is derived from `{projectName}-{stage}`, and region-scoped resources (like secrets and ACM certificates) must exist in the target region. Create stage-appropriate secrets in each region you deploy to.

### How does the stage name appear in AWS resource names?

Stacktape derives the CloudFormation stack name from `{projectName}-{stage}`. If the combined name is too long, Stacktape obfuscates some internal resource names to stay within AWS naming limits — keeping stage names short avoids this.

### What's the difference between stages and AWS accounts for environment separation?

Stages separate stacks and resources within the AWS account and region you deploy to. Separate AWS accounts can add a stronger IAM and billing boundary, but require additional account and CI/CD setup. Most teams start with stages (simpler, cheaper, faster feedback loops) and move to multi-account only when compliance or blast-radius requirements demand it. Stages and multi-account are not mutually exclusive — you can use stages within each account (e.g., `dev` and `staging` in a dev account, `production` in a prod account).

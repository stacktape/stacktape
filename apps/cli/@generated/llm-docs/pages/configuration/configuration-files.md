# Configuration Files

Stacktape configuration defines your infrastructure as code in a single file. You declare resources — APIs, databases, containers, functions — and Stacktape provisions them on AWS. The configuration supports two formats: TypeScript (recommended) and YAML. Both produce identical infrastructure; the choice affects your authoring experience.

## Choosing a format

TypeScript is the recommended format for most teams. It provides full type safety, IDE autocompletion, conditional logic, loops, and the ability to split configuration across multiple files with standard imports. YAML works for straightforward projects where configuration is static and short.


## Feature Comparison

| Feature | TypeScript | YAML |
| --- | --- | --- |
| Type checking | yes | no |
| IDE autocompletion | Full | With VS Code extension |
| Conditional logic | Native (if/else, ternary) | Via directives only |
| Loops / dynamic resources | Native (for, map) | no |
| Code reuse | Imports, functions, modules | Variables only |
| Refactoring support | yes | no |
| Multi-file configs | yes | no |


> **Tip:** Use TypeScript when your configuration involves per-stage differences, dynamic resource creation, or shared patterns across projects. Use YAML for prototypes or small projects with a fixed set of resources.


## When to use TypeScript

Most teams should default to TypeScript. It catches configuration errors before deployment, enables per-stage branching without separate config files, and supports extracting shared patterns into reusable modules. If your project has more than a handful of resources, or if you deploy to multiple stages with different sizing, TypeScript eliminates duplication and reduces misconfiguration risk.

## When to use YAML

YAML is appropriate for very small, static projects or when your team strongly prefers declarative-only configuration. A single Lambda function with an API gateway, or a static hosting bucket with a custom domain — these are cases where YAML's simplicity is an advantage. If you keep the same resource names and properties, TypeScript can represent the same configuration shape as YAML, so you can move to TypeScript later when you outgrow YAML (needing conditionals, loops, or multi-file organization).

## TypeScript configuration

Create a `stacktape.ts` file in your project root. Install the `stacktape` package as a dev dependency to get types and resource classes.

```bash
npm install stacktape --save-dev
```

The TypeScript config uses `defineConfig` as its entry point. You instantiate resource classes, configure them with typed properties, and return them from the callback.


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiIntegration
} from 'stacktape';
export default defineConfig(({ stage }) => {
  const api = new HttpApiGateway({
    cors: { enabled: true }
  });

  const handler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'api',
        method: 'GET',
        path: '/'
      })
    ]
  });

  return {
    resources: { api, handler }
  };
});
```


### The defineConfig callback

The `defineConfig` function receives a callback whose argument provides deploy-time context. Use these values for per-stage branching without separate config files.

| Property      | Type       | Description                                                  |
| ------------- | ---------- | ------------------------------------------------------------ |
| `stage`       | `string`   | Current stage name (e.g. `dev`, `production`)                |
| `region`      | `string`   | AWS region for this deployment (e.g. `eu-west-1`)            |
| `projectName` | `string`   | Project name passed via CLI                                  |
| `command`     | `string`   | The CLI command being run (`deploy`, `delete`, `dev`, etc.)  |
| `cliArgs`     | `string[]`   | Additional CLI arguments passed after `--`                   |

### Conditional logic and loops

Because the config is standard TypeScript, you can use any language feature to create resources dynamically. Branch on `stage` to size resources differently for production vs development, or loop over a list to generate multiple similar resources.


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
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  const usersHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handlers/users.ts'
    }),
    connectTo: [database]
  });

  return {
    resources: { database, usersHandler }
  };
});
```


### Splitting config across files

For large configurations, extract resource factory functions into separate `.ts` files and import them in `stacktape.ts` — a standard TypeScript module pattern. For example, define a `createDatabase` function in `config/database.ts` that accepts a `stage` parameter and returns a `RelationalDatabase` instance, then import it in your main config. The following example shows this pattern with the helper function defined inline for illustration:


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';
const createDatabase = (stage: string) =>
  new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: stage === 'production' ? 'db.t4g.medium' : 'db.t4g.micro'
      }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

export default defineConfig(({ stage }) => {
  const database = createDatabase(stage);
  return { resources: { database } };
});
```


In practice, you would move `createDatabase` to a separate file (e.g. `config/database.ts`), export it, and `import { createDatabase } from './config/database'` in your `stacktape.ts`. The pattern works identically — the helper returns a resource class instance that you include in the `resources` object.

### IDE experience

With TypeScript, your editor provides autocompletion for every property, inline JSDoc documentation on hover, go-to-definition for resource types, and real-time error highlighting. Typos in property names or invalid values are caught before you deploy. The `stacktape` package ships its own type definitions — no additional `@types` package is needed.

## YAML configuration

For simpler projects, create a `stacktape.yml` file in your project root.

YAML uses a `type` + `properties` structure for each resource. The `type` corresponds to the TypeScript resource class, and `properties` correspond to the constructor argument.


> **Info:** The Stacktape VS Code extension provides autocompletion, syntax validation, and inline documentation for YAML configuration files.


### When YAML falls short

YAML configuration cannot express conditional logic natively — you need [directives](/configuration/directives) for deploy-time interpolation. There are no loops, so you cannot generate resources dynamically. Large YAML configs tend to become repetitive because there is no import mechanism; [variables](/configuration/variables-and-reuse) provide limited reuse. If you find yourself working around these constraints, switch to TypeScript.

## Config file structure

Regardless of format, every Stacktape configuration has the same logical structure. The only required field is `resources`.

| Top-level field            | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `resources`                | Your infrastructure: functions, containers, databases, buckets, etc.    |
| `variables`                | Reusable values referenced with `$Var().variableName`. In TypeScript, ordinary constants are often simpler when deploy-time resolution is not needed |
| `hooks`                    | Run scripts before/after deploy, delete, or dev commands                |
| `scripts`                  | Shell commands or code files you can run manually or via hooks          |
| `directives`              | Custom deploy-time functions that compute config values dynamically     |
| `deploymentConfig`         | Rollback behavior, termination protection, artifact retention           |
| `stackConfig`              | Tags, custom outputs, VPC configuration                                 |
| `providerConfig`           | Credentials for third-party services (MongoDB Atlas, Upstash)           |
| `cloudformationResources`  | Raw CloudFormation resources (escape hatch)                             |

The following example shows a configuration with multiple resources wired together using `connectTo`. For additional top-level fields like `scripts` and `hooks`, see [Hooks and scripts](/configuration/hooks-and-scripts).


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
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [database]
  });

  return {
    resources: { database, api }
  };
});
```


## Config file detection

Stacktape auto-detects configuration files named `stacktape.ts`, `stacktape.yml`, `stacktape.yaml`, or `stacktape.js` in your project root. You can point to a different location with the `--configPath` option. See the [`deploy`](/cli/deploy) command reference for details.

```bash
stacktape deploy --stage production --configPath ./infrastructure/stacktape.ts
```

## Directives in configuration

Both TypeScript and YAML configurations support [directives](/configuration/directives) — built-in functions that resolve values at deploy time. In TypeScript, directives are imported as functions from the `stacktape` package. In YAML, all directives use a `$DirectiveName()` string syntax.

Common built-in directives available as TypeScript functions from the `stacktape` package:

| Directive              | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `$Secret()`            | Reference a Stacktape secret                                 |
| `$ResourceParam()`     | Reference a deployed resource's parameter                    |
| `$Stage()`             | Returns the current stage name                               |
| `$Region()`            | Returns the current AWS region                               |
| `$Format()`            | String interpolation with deploy-time values                 |
| `$Var()`               | Reference a value from the `variables` section               |
| `$File()`              | Include contents of a file at deploy time                    |

In TypeScript configs, you can often use normal constants instead of `$Var()`, standard `import`/`readFileSync` instead of `$File()`, and template literals instead of `$Format()`. The directive functions are available when you need deploy-time resolution behavior that cannot be replaced by build-time TypeScript evaluation.

See [Directives](/configuration/directives) for the full list of available directives and detailed usage.

## How TypeScript maps to YAML

YAML resources use a `type` plus `properties` shape. In TypeScript, the equivalent resource is represented by a resource class whose constructor receives the corresponding property shape. Nested objects in YAML (packaging modes, engines, integrations) also use `type` + `properties`; in TypeScript, these correspond to nested class constructors.

The table below shows the mapping between TypeScript classes and YAML types. This is not exhaustive — see individual resource pages for the full set of options.

| TypeScript class                       | YAML type                       |
| -------------------------------------- | ------------------------------- |
| `LambdaFunction`                       | `function`                      |
| `EdgeLambdaFunction`                   | `edge-lambda-function`          |
| `WebService`                           | `web-service`                   |
| `PrivateService`                       | `private-service`               |
| `WorkerService`                        | `worker-service`                |
| `MultiContainerWorkload`               | `multi-container-workload`      |
| `BatchJob`                             | `batch-job`                     |
| `NextjsWeb`                            | `nextjs-web`                    |
| `RelationalDatabase`                   | `relational-database`           |
| `DynamoDbTable`                        | `dynamo-db-table`               |
| `RedisCluster`                         | `redis-cluster`                 |
| `MongoDbAtlasCluster`                  | `mongo-db-atlas-cluster`        |
| `UpstashRedis`                         | `upstash-redis`                 |
| `OpenSearchDomain`                     | `open-search-domain`            |
| `HttpApiGateway`                       | `http-api-gateway`              |
| `ApplicationLoadBalancer`              | `application-load-balancer`     |
| `NetworkLoadBalancer`                  | `network-load-balancer`         |
| `Bucket`                               | `bucket`                        |
| `HostingBucket`                        | `hosting-bucket`                |
| `EfsFilesystem`                        | `efs-filesystem`                |
| `SqsQueue`                             | `sqs-queue`                     |
| `SnsTopic`                             | `sns-topic`                     |
| `EventBus`                             | `event-bus`                     |
| `UserAuthPool`                         | `user-auth-pool`                |
| `WebAppFirewall`                       | `web-app-firewall`              |
| `Bastion`                              | `bastion`                       |
| `StateMachine`                         | `state-machine`                 |

## FAQ

### Should I use TypeScript or YAML for my Stacktape config?

Use TypeScript for most projects. It catches configuration errors before deployment, provides full IDE support, and lets you use conditional logic and loops for per-stage differences. YAML is appropriate for very small, static projects with a fixed set of resources, or when your team strongly prefers declarative-only configuration. Both produce identical infrastructure — the choice only affects your authoring experience.

### Can I switch from YAML to TypeScript?

YAML and TypeScript represent the same logical config shape: named resources with resource-specific properties. Rename your `stacktape.yml` to `stacktape.ts` and rewrite the resources using the `defineConfig` pattern and resource classes, keeping resource names and property values stable. Then run [`stacktape synth`](/cli/synth) to verify the output before deploying.

### Can I use JavaScript instead of TypeScript?

Yes — Stacktape accepts `stacktape.js` files using the same `defineConfig` pattern. However, you lose type checking and IDE autocompletion. TypeScript is strongly recommended. The `stacktape` package ships its own type definitions, so no additional `@types` package is needed.

### How do I pass per-stage values without duplicating config?

In TypeScript, use the `stage` parameter from the `defineConfig` callback to branch conditionally (`stage === 'production' ? 'db.t4g.medium' : 'db.t4g.micro'`). In YAML, use the `variables` section combined with [directives](/configuration/directives) like `$Stage()` for stage-aware interpolation.

### How do I keep secrets out of my config file?

Use the `$Secret()` directive to reference a Stacktape secret instead of hardcoding sensitive values like database passwords or API keys. The reference resolves securely at deploy time, so the actual value never appears in your config or version control. In TypeScript, import `$Secret` from the `stacktape` package; in YAML, use the `$Secret()` string syntax. See [Secrets](/configuration/secrets) for how to create and manage secrets.

### How do I validate my configuration before deploying?

In TypeScript, the type system catches most errors in your editor. For both formats, run [`stacktape synth`](/cli/synth) to compile your configuration before deploying.

### Can I use raw CloudFormation alongside Stacktape resources?

Yes. The `cloudformationResources` top-level field accepts raw CloudFormation resource definitions merged into the template alongside Stacktape-managed resources. This is an escape hatch for AWS services Stacktape doesn't have a built-in resource type for. See [Raw CloudFormation resources](/resources/advanced/raw-cloudformation-resources) for details.

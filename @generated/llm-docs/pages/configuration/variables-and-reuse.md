# Variables and Reuse

Stacktape supports both [TypeScript and YAML configuration](/configuration/configuration-files). TypeScript gives you full language-level tools for eliminating duplication: constants, functions, imports, and conditional logic. For YAML configurations, the `variables` property provides named reusable values referenced with `$Var().variableName`. Neither format requires an external templating engine.

## Why reuse matters

Duplicated values — ports, instance sizes, domain prefixes, environment variables — create drift risk. When you change a value in one place but forget another, your staging stage diverges from production in ways that are hard to debug. Centralizing shared values makes the config a single source of truth and reduces the surface area for mistakes.

## TypeScript-native reuse

The [`defineConfig`](/configuration/configuration-files) callback returns your configuration as plain TypeScript. You can use any language feature — constants, conditionals, loops, imports, spread operators — to reduce duplication and add stage-aware logic.

### Shared constants

Extract repeated values into `const` declarations. The TypeScript compiler ensures type safety, and your editor provides autocomplete. Both Lambda functions below use the same `timeout` and `APP_PORT` values — extracting these into `const timeout = 30` and `const appPort = '3000'` at the top of the callback means each value is updated in one place.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiGateway
} from 'stacktape';
export default defineConfig(() => {
  const listUsers = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/list-users.ts' }),
    timeout: 30,
    environment: { APP_PORT: '3000' }
  });

  const createUser = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/create-user.ts' }),
    timeout: 30,
    environment: { APP_PORT: '3000' }
  });

  const gateway = new HttpApiGateway({});

  return { resources: { listUsers, createUser, gateway } };
});
```


When you spot duplicated values like these, extract them into `const` declarations at the top of the callback. This applies to any repeated value: memory sizes, environment variable blocks, domain prefixes, or timeout durations.

### Stage-based conditional logic

The `stage` parameter from `defineConfig` lets you branch configuration per [stage](/configuration/stages-and-environments) without external tooling or environment-variable hacks. Destructure `stage` from the callback parameter and use it in conditional expressions — for example, `memory: stage === 'production' ? 2048 : 512` gives production more RAM while other stages use a smaller allocation.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
    memory: 2048
  });

  return { resources: { api } };
});
```


Use the same conditional pattern for any stage-dependent setting — backup retention, instance counts, alarm thresholds, or whether to provision optional resources at all.

### Helper functions

When multiple resources share the same shape, extract a factory function. This is especially useful for [Lambda functions](/resources/compute/lambda-function) with repeated packaging and event configuration. Define the factory inside `defineConfig` and call it for each endpoint.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiGateway,
  HttpApiIntegration
} from 'stacktape';
export default defineConfig(() => {
  const createApiFunction = (
    entryfile: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string
  ) =>
    new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: entryfile }),
      memory: 512,
      timeout: 30,
      events: [new HttpApiIntegration({ httpApiGatewayName: 'gateway', method, path })]
    });

  const listUsers = createApiFunction('./src/list-users.ts', 'GET', '/users');
  const createUser = createApiFunction('./src/create-user.ts', 'POST', '/users');
  const gateway = new HttpApiGateway({});

  return { resources: { listUsers, createUser, gateway } };
});
```


The `memory` property sets the MB of RAM allocated to each Lambda function (512 MB here), and `timeout` sets the maximum execution time in seconds (30 s). Both Lambda functions share these values and the gateway integration shape — you define them once.

### Shared modules across projects

For organizations with multiple Stacktape projects that share conventions (tagging, naming, scaling defaults), create a shared TypeScript module — either a local file or a published package:

```typescript
// shared/defaults.ts
export const defaultTags = { team: 'platform', managedBy: 'stacktape' };
export const defaultTimeout = 30;
export const defaultMemory = 512;
```

Import these constants into each project's `stacktape.ts`. This keeps org-wide conventions in sync without copy-paste, and TypeScript catches type errors at build time if the shape of your shared config changes.

### Other TypeScript patterns

Beyond constants, stage branching, and factory functions, several other standard TypeScript patterns work inside `defineConfig`:

- **Object spreading** — define a shared object (e.g. `const sharedEnv = { LOG_LEVEL: 'info', NODE_ENV: 'production' }`) and spread it into each resource's `environment`: `environment: { ...sharedEnv, SERVICE_NAME: 'api' }`. This keeps shared values in one place while letting each resource add its own overrides. Works equally well for tags, scaling configuration, or VPC settings.

- **Conditional resources** — use conditional spread syntax inside `defineConfig` to include resources only for certain stages. For example, return `{ resources: { api, ...(isProduction ? { metricsExporter } : {}) } }` where `metricsExporter` is a `LambdaFunction` declared earlier in the callback. Resources not spread into the returned object are not created — other stages skip them entirely.

- **Dynamic resource generation** — use `Array.map()` or a `for` loop to create multiple resources from a data array. The `resources` object accepts any string keys, so `Object.fromEntries()` combined with `Array.map()` can generate one `LambdaFunction` per route from a data array. Adding a new route means adding one entry to the array.

## The variables property

The top-level `variables` property defines named values you can reference with the `$Var()` [directive](/configuration/directives). It is part of the root configuration alongside `resources`, `hooks`, `scripts`, and `directives`, and works in both YAML and TypeScript configs.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' })
  });

  return {
    variables: {
      appPort: 3000,
      apiDomain: 'api.example.com'
    },
    resources: { api }
  };
});
```


Variables can hold any value: strings, numbers, booleans, objects, or arrays. Reference a variable with `$Var().variableName` anywhere in the config — for example, inside a resource's `environment` block:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
    environment: {
      APP_PORT: '$Var().appPort',
      API_DOMAIN: '$Var().apiDomain'
    }
  });

  return {
    variables: {
      appPort: '3000',
      apiDomain: 'api.example.com'
    },
    resources: { api }
  };
});
```


### When to use variables vs TypeScript constants

| Approach | Best for | Tradeoffs |
| --- | --- | --- |
| TypeScript `const` | Most cases | Full type safety, autocomplete, conditional logic, refactoring support |
| `variables` + `$Var()` | YAML configs | No type checking, no autocomplete, but works without TypeScript tooling |

The `variables` property defines reusable values referenced with `$Var().variableName` anywhere in the config. In TypeScript configs, language-level constants cover the same need and additionally support type checking and conditional logic; `variables` is the primary mechanism in YAML where those language features are not available.

## Custom directives

When you need values computed dynamically at deploy time — fetching from external APIs, reading infrastructure state, or running conditional logic — define a [custom directive](/configuration/directives). Custom directives are registered in the `directives` array, each pointing to a JS, TypeScript, or Python handler file.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' })
  });

  return {
    directives: [{ name: 'FetchConfig', filePath: './directives/fetch-config.ts' }],
    resources: { api }
  };
});
```


The handler file exports a default function that receives any parameters passed in the directive call and returns the computed value. Once registered, use `$FetchConfig()` anywhere in the config. Custom directives compute config values at deploy time before the CloudFormation template is generated.

For most TypeScript configs, you can replace custom directives with regular imports and logic in your `stacktape.ts` — custom directives are most relevant for YAML workflows or when you need to separate computation into dedicated handler files.

## Reusable scripts and hooks

Stacktape provides two related mechanisms for reusable operational logic beyond configuration values:

- **Scripts** define reusable shell commands or code you can run with [`stacktape script:run`](/cli/script-run) or attach to lifecycle hooks. Scripts support [`connectTo`](/configuration/connecting-resources) to inject environment variables such as database URLs and API keys. Script types include `local-script` (runs on your machine or CI), `local-script-with-bastion-tunneling` (tunnels to VPC resources), and `bastion-script` (runs inside your VPC).

- **Hooks** attach scripts to deploy, delete, or dev lifecycle events — for example, running database migrations after every deployment or building a frontend before deploy.

See [hooks and scripts](/configuration/hooks-and-scripts) for details and examples.

## When NOT to use reuse

Not every repeated value needs extraction. Over-abstracting config makes it harder to read and reason about.

- **One occurrence** — leave it inline. A constant for a single-use value adds indirection without benefit.
- **Two occurrences** — consider extraction if the values are likely to change together.
- **Three or more** — extract into a constant or helper.
- **Factory functions** — use only when the shared shape is stable. If each resource diverges significantly, inline definitions are clearer.

The goal is clarity and correctness, not minimal line count. A config file that reads top-to-bottom without jumping between files is easier to review than one that requires tracing through three layers of helpers.

## FAQ

### Can I use environment variables in my stacktape.ts?

Yes. Since `stacktape.ts` is a regular TypeScript file, you can read `process.env` values when the config is evaluated. Use `process.env` for truly external values like CI tokens or build-time feature flags that you don't want to commit to the repository.

### What's the difference between $Var() and a TypeScript const?

`$Var()` is a [directive](/configuration/directives) that reads from the config's `variables` map. A TypeScript `const` is a language-level variable resolved during module evaluation. In TypeScript configs, `const` gives you type checking, autocomplete, and conditional logic. Reserve `$Var()` for YAML configs where native language features are not available.

### How do I share configuration across multiple Stacktape projects?

Create a shared TypeScript module (local file or published npm package) that exports constants, helper functions, or partial resource configurations. Import it into each project's `stacktape.ts`. This is more reliable than duplicating values across projects because TypeScript catches type errors at build time when the shared module's shape changes.

### What happens to variables at runtime?

Variables and constants defined in `stacktape.ts` exist only when the config is evaluated before deployment. They do not automatically appear as runtime values in your deployed Lambda functions or containers. To pass a value to a running workload, set it in the resource's `environment` property — which maps to environment variables available at runtime.

### How do I avoid hardcoding the stage name in custom domains?

Use the `stage` parameter from `defineConfig` to construct [custom domain](/resources/networking/custom-domains) names dynamically. For example, `` domainName: `${stage}.api.example.com` `` gives each stage its own subdomain without manual per-environment configuration.

### When should I use a custom directive instead of inline TypeScript?

Custom directives are most useful in YAML configs where you need deploy-time computation that depends on external state (API calls, file system reads, database lookups). In TypeScript configs, the same logic can usually live directly in your `stacktape.ts` as regular imports and function calls — no directive registration needed.

### Can I generate resources dynamically in a loop?

Yes. Use standard TypeScript loops or `Array.map()` inside `defineConfig` to create multiple resources programmatically. The `resources` object accepts any string keys — those keys become resource names. This is useful for generating one Lambda function per API route or one SQS queue per processing pipeline from a data array.

### Should I use one stacktape.ts or split into multiple files?

Stacktape reads a single configuration file. But that file can import from any number of TypeScript modules. For small-to-medium projects, keep everything in one file. For larger projects with 10+ resources, split resource definitions into separate files (e.g. `api.ts`, `database.ts`, `workers.ts`) and import them into your main `stacktape.ts`. The split is a code organization choice — Stacktape processes the merged result identically.

### TypeScript config vs YAML config — which should I use?

TypeScript is the recommended default. It gives you type checking, autocomplete, conditional logic, loops, and imports — all of which eliminate the need for custom templating. YAML works if your team prefers declarative config and doesn't need stage-based branching or dynamic resource generation. Both formats produce the same underlying configuration. See [configuration files](/configuration/configuration-files) for setup details.

### How do Stacktape config variables compare to CloudFormation parameters?

Stacktape `variables` (and TypeScript constants) are resolved at config evaluation time, before the CloudFormation template is generated. CloudFormation parameters are resolved at deploy time by the CloudFormation service itself. Stacktape's approach means your entire config is fully resolved before deployment starts, which makes the template deterministic and easier to debug. For values that must remain secret until deploy time, use the [`$Secret()` directive](/configuration/secrets) instead of `variables`.

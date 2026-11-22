# Variables and reuse

To avoid repeating values such as ports, sizes or domain prefixes, use ordinary constants, functions and imports in a TypeScript config. In YAML, use the `variables` section and reference values with `$Var().variableName`. For values computed at deploy time, define a custom directive.

## TypeScript-native reuse

The [`defineConfig`](/configuration/configuration-files) callback returns your configuration as plain TypeScript. You can use any language feature (constants, conditionals, loops, imports, spread operators) to reduce duplication and add stage-aware logic.

### Shared constants

Extract repeated values into `const` declarations. The TypeScript compiler ensures type safety, and your editor provides autocomplete. Both Lambda functions below use the same `timeout` and `APP_PORT` values: extracting these into `const timeout = 30` and `const appPort = '3000'` at the top of the callback means each value is updated in one place.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  HttpApiGateway,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const listUsers = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/list-users.ts' }),
    timeout: 30,
    environment: { APP_PORT: '3000' }
  });

  const createUser = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/create-user.ts' }),
    timeout: 30,
    environment: { APP_PORT: '3000' }
  });

  const gateway = new HttpApiGateway({});

  return { resources: { listUsers, createUser, gateway } };
});
```


When you spot duplicated values like these, extract them into `const` declarations at the top of the callback. This applies to any repeated value: memory sizes, environment variable blocks, domain prefixes, or timeout durations.

### Stage-based conditional logic

The `stage` parameter from `defineConfig` lets you branch configuration per [stage](/configuration/stages-and-environments) without external tooling or environment-variable hacks. Destructure `stage` from the callback parameter and use it in conditional expressions: for example, `memory: stage === 'production' ? 2048 : 512` gives production more RAM while other stages use a smaller allocation.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
    memory: 2048
  });

  return { resources: { api } };
});
```


Use the same conditional pattern for any stage-dependent setting: backup retention, instance counts, alarm thresholds, or whether to provision optional resources at all.

### Helper functions

When multiple resources share the same shape, extract a factory function. This is especially useful for [Lambda functions](/resources/compute/lambda-function) with repeated packaging and event configuration. Define the factory inside `defineConfig` and call it for each endpoint.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const createApiFunction = (
    entryfile: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string
  ) =>
    new LambdaFunction({
      packaging: new JsBundleLambdaPackaging({ entryfilePath: entryfile }),
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


The `memory` property sets the MB of RAM allocated to each Lambda function (512 MB here), and `timeout` sets the maximum execution time in seconds (30 s). Both Lambda functions share these values and the gateway integration shape: you define them once.

### Shared modules across projects

For organizations with multiple Stacktape projects that share conventions (tagging, naming, scaling defaults), create a shared TypeScript module: either a local file or a published package:

```typescript
// shared/defaults.ts
export const defaultTags = { team: 'platform', managedBy: 'stacktape' };
export const defaultTimeout = 30;
export const defaultMemory = 512;
```

Import these constants into each project's `stacktape.ts`. This keeps org-wide conventions in sync without copy-paste, and TypeScript catches type errors at build time if the shape of your shared config changes.

### Other TypeScript patterns

Beyond constants, stage branching, and factory functions, several other standard TypeScript patterns work inside `defineConfig`:

- **Object spreading**: define a shared object (e.g. `const sharedEnv = { LOG_LEVEL: 'info', NODE_ENV: 'production' }`) and spread it into each resource's `environment`: `environment: { ...sharedEnv, SERVICE_NAME: 'api' }`. This keeps shared values in one place while letting each resource add its own overrides. Works equally well for tags, scaling configuration, or VPC settings.

- **Conditional resources**: use conditional spread syntax inside `defineConfig` to include resources only for certain stages. For example, return `{ resources: { api, ...(isProduction ? { metricsExporter } : {}) } }` where `metricsExporter` is a `LambdaFunction` declared earlier in the callback. Resources not spread into the returned object are not created: other stages skip them entirely.

- **Dynamic resource generation**: use `Array.map()` or a `for` loop to create multiple resources from a data array. The `resources` object accepts any string keys, so `Object.fromEntries()` combined with `Array.map()` can generate one `LambdaFunction` per route from a data array. Adding a new route means adding one entry to the array.

## The variables property

The top-level `variables` property defines named values you can reference with the `$Var()` [directive](/configuration/directives). It is part of the root configuration alongside `resources`, `hooks`, `scripts`, and `directives`, and works in both YAML and TypeScript configs.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' })
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


Variables can hold any value: strings, numbers, booleans, objects, or arrays. Reference a variable with `$Var().variableName` anywhere in the config: for example, inside a resource's `environment` block:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
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

When you need values computed dynamically at deploy time (fetching from external APIs, reading infrastructure state, or running conditional logic) define a [custom directive](/configuration/directives). Custom directives are registered in the `directives` array, each pointing to a JS, TypeScript, or Python handler file.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' })
  });

  return {
    directives: [{ name: 'FetchConfig', filePath: './directives/fetch-config.ts' }],
    resources: { api }
  };
});
```


The handler file exports a default function that receives any parameters passed in the directive call and returns the computed value. Once registered, use `$FetchConfig()` anywhere in the config. Custom directives compute config values at deploy time before the CloudFormation template is generated.

For most TypeScript configs, you can replace custom directives with regular imports and logic in your `stacktape.ts`: custom directives are most relevant for YAML workflows or when you need to separate computation into dedicated handler files.

For commands you want to reuse, such as a seed script or a frontend build, see [Hooks and scripts](/configuration/hooks-and-scripts).

Extract a value when it appears in several places that must change together. A config that reads top to bottom is easier to review than one that sends you through several helper files.

## FAQ

### Can I use environment variables in my stacktape.ts?

Yes. Since `stacktape.ts` is a regular TypeScript file, you can read `process.env` values when the config is evaluated. Use `process.env` for truly external values like CI tokens or build-time feature flags that you don't want to commit to the repository.

### What happens to variables at runtime?

Variables and constants defined in `stacktape.ts` exist only when the config is evaluated before deployment. They do not automatically appear as runtime values in your deployed Lambda functions or containers. To pass a value to a running workload, set it in the resource's `environment` property: which maps to environment variables available at runtime.

### How do Stacktape config variables compare to CloudFormation parameters?

Stacktape `variables` (and TypeScript constants) are resolved at config evaluation time, before the CloudFormation template is generated. CloudFormation parameters are resolved at deploy time by the CloudFormation service itself. Stacktape's approach means your entire config is fully resolved before deployment starts, which makes the template deterministic and easier to debug. For values that must remain secret until deploy time, use the [`$Secret()` directive](/configuration/secrets) instead of `variables`.

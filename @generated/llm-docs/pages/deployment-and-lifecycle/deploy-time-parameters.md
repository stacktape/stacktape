# Deploy-Time Parameters

Deploy-time parameters make a single Stacktape configuration work across multiple stages, regions, and deployment contexts. Built-in [directives](/configuration/directives) like `$Stage()`, `$CliArgs()`, and `$Secret()` inject context-dependent values when you run [`stacktape deploy`](/cli/deploy). In TypeScript configs, the `defineConfig` callback also gives you programmatic access to deployment metadata for conditional logic.

## TypeScript callback parameters

The `defineConfig` callback in TypeScript configs receives deployment metadata you can use for programmatic logic — branching on stage, adjusting resource sizes, or toggling features conditionally. The available deployment context mirrors what the built-in directives expose: stage, region, AWS account ID, profile, and CLI arguments.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(({ stage, region }) => {
  const isProduction = stage === 'production';

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    memory: isProduction ? 2048 : 512,
    environment: [
      { name: 'STAGE', value: stage },
      { name: 'REGION', value: region },
      { name: 'LOG_LEVEL', value: isProduction ? 'warn' : 'debug' }
    ]
  });

  return { resources: { api } };
});
```


This approach gives you full TypeScript control — conditionals, loops, helper functions, and type safety. For string values that must resolve during CloudFormation stack creation (like [secrets](/configuration/secrets) or [resource references](/configuration/referenceable-parameters)), use directive strings instead.

## Directive syntax

Directives are string expressions that Stacktape detects and resolves during deployment. They follow the pattern `$DirectiveName(param1, param2)` and can appear as standalone values or embedded in larger strings.

A directive like `$Stage()` can be a standalone property value. You can also embed directives directly in strings — for example, `api-$Stage()-endpoint` is automatically converted to the equivalent `$Format('api-{}-endpoint', '$Stage()')` call. Access nested properties with dot notation after the closing parenthesis: `$File('./config.json').database.host`.

### Resolution phases

Directives resolve in one of two phases, depending on when the value becomes available.

**Config-time directives** resolve during CLI execution, before the CloudFormation template is generated. The directive string is replaced with a concrete value (string, number, or object) baked into the template. Config-time directives include `$Stage`, `$Region`, `$CliArgs`, `$File`, `$FileRaw`, `$Format`, `$GitInfo`, `$AwsAccountId`, `$Profile`, `$StackOutput`, `$Var`, and `$This`.

**CloudFormation-time directives** produce CloudFormation intrinsic functions that AWS resolves during stack creation. Use these for values that depend on resources being created — database endpoints, secrets, or cross-resource references. CloudFormation-time directives include `$Secret`, `$SsmParam`, `$ResourceParam`, `$CfResourceParam`, `$CfFormat`, and `$CfStackOutput`.

For the complete directive reference, see [Directives](/configuration/directives). For reusable variables and config composition, see [Variables and reuse](/configuration/variables-and-reuse).

## Deployment context directives

Stacktape exposes deployment context through four config-time directives. These are the most commonly used deploy-time parameters — they make environment variables, resource names, and other config values stage-aware without conditional logic.

| Directive | Returns | Source |
|---|---|---|
| `$Stage()` | Stage name passed to the CLI | `globalStateManager.targetStack.stage` |
| `$Region()` | Target AWS region | Current deployment region |
| `$AwsAccountId()` | AWS account ID | Target AWS account |
| `$Profile()` | AWS profile name | Configured AWS profile |


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: [
      { name: 'STAGE', value: '$Stage()' },
      { name: 'REGION', value: '$Region()' },
      { name: 'ACCOUNT_ID', value: '$AwsAccountId()' }
    ]
  });

  return { resources: { api } };
});
```


Your application code reads these from `process.env.STAGE`, `process.env.REGION`, etc. The `$Stage()` directive is by far the most common — it lets runtime code adjust logging, feature flags, or service endpoints based on the deployment stage.

## Custom CLI arguments

The `$CliArgs()` directive reads custom values passed at the command line. It accepts two parameters: the argument name and an optional default value. When the named argument is not found, `$CliArgs()` returns the default value (or `undefined` if no default is provided). Internally, it merges standard CLI arguments with additional arguments and looks up the named key.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: [
      { name: 'LOG_LEVEL', value: "$CliArgs('logLevel', 'info')" },
      { name: 'API_VERSION', value: "$CliArgs('apiVersion', 'v1')" }
    ]
  });

  return { resources: { api } };
});
```


Pass custom arguments after a `--` separator when running a CLI command.

Deploy with a custom log level:

```bash
stacktape deploy --stage production --region eu-west-1 -- --logLevel debug
```

Deploy with all defaults (no custom arguments needed):

```bash
stacktape deploy --stage dev --region eu-west-1
```

Always provide a default for values your config depends on. If no matching argument is found and no default is specified, the directive resolves to `undefined`.


> **Tip:** `$CliArgs()` can also read standard CLI arguments like `stage` and `region`. The dedicated directives (`$Stage()`, `$Region()`) are clearer for standard parameters — reserve `$CliArgs()` for custom arguments.


## External configuration files

The `$File()` directive loads and parses structured data from external files at config-time. It supports `.env`, JSON, YAML, or INI files. Access nested properties with dot notation after the directive call.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: [
      { name: 'API_ENDPOINT', value: "$File('./config/settings.json').apiEndpoint" },
      { name: 'CACHE_TTL', value: "$File('./config/settings.json').cacheTtl" }
    ]
  });

  return { resources: { api } };
});
```


File paths resolve relative to the working directory. If the file format is not one of the supported types (`.env`, JSON, YAML, or INI), `$File()` throws an error and suggests using `$FileRaw()` instead. The loaded file is automatically parsed and its properties can be accessed with dot notation like `$File("myfile.json").myProperty`.

**`$FileRaw()`** loads a file's raw content as a string without parsing. Use it for plain text, HTML templates, or any format that `$File()` does not support.

## Git metadata

The `$GitInfo()` directive provides metadata from the current Git repository at config-time. Use it to tag deployments with commit hashes or branch names for traceability and debugging. It reads a property from Stacktape's Git metadata — if you pass an invalid property name, the error message lists all valid arguments.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: [
      { name: 'GIT_COMMIT', value: "$GitInfo('commit')" },
      { name: 'GIT_BRANCH', value: "$GitInfo('branch')" }
    ]
  });

  return { resources: { api } };
});
```


The directive is lazy-loaded — it only reads Git information when the directive is actually used in the config. Common property names include `branch`, `commit`, `username`, `gitUrl`, and `hasUncommitedChanges`, though the authoritative list is shown in the error message if you provide an invalid name.

## String composition

When you need to combine multiple values into a single string, use `$Format()` (config-time) or `$CfFormat()` (CloudFormation-time). Both use `{}` as positional placeholders replaced sequentially by the remaining arguments.

### $Format

`$Format()` resolves during config parsing. The result is a static string baked into the CloudFormation template. Use it to compose URLs, database names, or any string that combines deploy-time context.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: [
      { name: 'APP_DOMAIN', value: "$Format('https://api-{}.example.com', '$Stage()')" },
      { name: 'DB_NAME', value: "$Format('myapp_{}', '$Stage()')" }
    ]
  });

  return { resources: { api } };
});
```


You can also embed directives directly in strings without explicit `$Format()`. Stacktape detects embedded directives and converts them automatically — `api-$Stage()-endpoint` is equivalent to `$Format('api-{}-endpoint', '$Stage()')`.

### $CfFormat

`$CfFormat()` produces a CloudFormation `Sub` expression that resolves during stack creation. Use it when composing strings that include CloudFormation-time values like [`$ResourceParam()`](/configuration/referenceable-parameters) references. For config-time values, prefer `$Format()` or the embedded directive syntax — they produce simpler templates.

During local resolution (in [`stacktape dev`](/local-development/dev-mode-overview)), `$CfFormat()` performs simple string interpolation by replacing `{}` placeholders with the resolved values.

## Cross-stack references

Two directives read outputs exported from other CloudFormation stacks. Both accept the full stack name, the output name, and an optional region parameter. The referenced output must be exported from the source stack.

### $StackOutput

`$StackOutput()` fetches a stack output at config-time. The value is resolved by the CLI and baked into the template as a static string. Use it when you want a snapshot of the value at deploy time.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: [
      { name: 'SHARED_API_URL', value: "$StackOutput('shared-infra-production', 'ApiUrl')" }
    ]
  });

  return { resources: { api } };
});
```


The directive expects the full CloudFormation stack name. Stacktape's error hint describes full names as `{stackName}-{stage}`. The referenced stack must be deployed and have the specified output exported. Only exported outputs can be referenced — if the output exists but is not exported, the directive throws an error with instructions to export it first.

### $CfStackOutput

`$CfStackOutput()` returns a CloudFormation import-value reference that resolves during stack creation. If the source stack's exported output changes, the consuming stack picks up the new value on its next update — unlike `$StackOutput()`, which snapshots the value at deploy time.

To reference a stack in a different AWS region, pass the region as the third argument to either directive: `$StackOutput('shared-infra-production', 'VpcId', 'us-east-1')`.

## Secrets and SSM parameters

For sensitive values, use CloudFormation-time directives that resolve during stack creation.

**`$Secret()`** references a value stored in AWS Secrets Manager. Stacktape looks up the secret during deployment to validate the reference and pin the current version, then writes a Secrets Manager dynamic reference into the template rather than plaintext. For JSON secrets, use dot notation to access specific keys: `$Secret('mySecret.apiKey')`. If a secret does not exist, the directive throws an error with a hint to create it using [`stacktape secret:create`](/cli/secret-create). Create secrets with [`stacktape secret:create`](/cli/secret-create) or in the [Stacktape Console](/stacktape-console/console-overview). See [Secrets](/configuration/secrets) for the full guide.

**`$SsmParam()`** references a value stored in AWS Systems Manager Parameter Store. It uses a secure dynamic reference (`ssm-secure`) for `SecureString` parameters and a standard SSM dynamic reference for other parameter types. The parameter version is pinned at deploy time to produce a deterministic reference.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: [
      { name: 'DB_PASSWORD', value: "$Secret('dbPassword')" },
      { name: 'STRIPE_KEY', value: "$Secret('stripeConfig.apiKey')" },
      { name: 'FEATURE_CONFIG', value: "$SsmParam('/myapp/feature-config')" }
    ]
  });

  return { resources: { api } };
});
```


## Variables and self-reference

Two config-time directives help reduce duplication and access the raw config structure.

**`$Var()`** returns the `variables` block of your config. Define shared values once in [variables](/configuration/variables-and-reuse) and reference them anywhere: `$Var().myDomain`.

**`$This()`** returns the entire raw config object. Use it for computed values that depend on other parts of the config. Both resolve at config-time — the result is a concrete value baked into the template.

## FAQ

### Can I use directives in any config property?

Config-time directives (like `$Stage()` and `$CliArgs()`) resolve to plain values before the template is built, so they work in any property that accepts the resolved type. CloudFormation-time directives (like `$Secret()` and `$ResourceParam()`) produce dynamic references or intrinsic function expressions that CloudFormation resolves during stack creation — these work in properties that accept string values.

### What happens if a $CliArgs argument is not provided?

If the named argument is not found in the merged CLI arguments and no default value is specified, `$CliArgs()` resolves to `undefined`. Always provide a default for values your config depends on: `$CliArgs('myArg', 'fallback')`.

### What is the difference between $Format and $CfFormat?

`$Format()` resolves at config-time — the result is a static string in the CloudFormation template. `$CfFormat()` produces a CloudFormation `Sub` expression that resolves during stack creation. Use `$CfFormat()` when composing strings that include CloudFormation-time values like [`$ResourceParam()`](/configuration/referenceable-parameters) references. For everything else, prefer `$Format()` or the embedded directive syntax (`api-$Stage()-endpoint`).

### Can I nest directives?

Yes. You can pass one directive as an argument to another. For example, `$Format('https://{}.example.com', '$Stage()')` first resolves `$Stage()`, then passes the result to `$Format()`. Inner directives resolve before outer ones.

### How do I manage different configurations for development and production?

The most common approach is the `defineConfig` callback — destructure `stage` and use TypeScript conditionals to vary memory, timeout, or environment variables by stage. For string-valued properties, embed `$Stage()` directly. For stage-specific external config, use `$File()` to load different settings files. For sensitive values that differ per stage, create separate [secrets](/configuration/secrets) per stage. See [Stages and environments](/configuration/stages-and-environments) for the full guide.

### How do I pass secrets to my application at deploy time?

Use the `$Secret()` directive in environment variables. Stacktape validates the secret and pins the current version during deployment, then writes a Secrets Manager dynamic reference into the CloudFormation template — the plaintext value never appears in the template. Create secrets with [`stacktape secret:create`](/cli/secret-create) or in the [Stacktape Console](/stacktape-console/console-overview). See [Secrets](/configuration/secrets) for setup details.

### Should I use directives or TypeScript conditionals for stage-specific config?

Both work. TypeScript conditionals in `defineConfig` give full programmatic control — branching, loops, type safety — and work for any property type (numbers, objects, arrays). Directives are embedded in string values and work identically in YAML and TypeScript configs. For simple string substitutions, directives are concise. For complex logic (different resource shapes per stage, conditional resources), TypeScript conditionals are clearer. Most projects use both: callback parameters for structural decisions, directives for string values.

### Can I reference outputs from a stack in a different AWS region?

Yes. Both `$StackOutput()` and `$CfStackOutput()` accept an optional third parameter for the region: `$StackOutput('my-stack-production', 'ApiUrl', 'us-east-1')`. If omitted, they look up the stack in the current deployment region. The referenced stack must be deployed and have the specified output exported.

### How do CloudFormation-time directives behave during local development?

During [`stacktape dev`](/local-development/dev-mode-overview), each CloudFormation-time directive resolves differently. `$ResourceParam()` reads from the deployed stack overview — if the referenced value is null and `--disableEmulation` is set, it returns a missing-output identifier instead of throwing; without `--disableEmulation`, it throws an error with a hint to use the flag. `$Secret()` fetches the actual secret value from Secrets Manager (using the version ID from the deployed stack output if available) and throws an error if the fetch fails. `$SsmParam()` fetches the parameter value from SSM Parameter Store directly.

### When should I use $File vs $CliArgs for external configuration?

Use `$File()` for structured, version-controlled configuration (JSON, YAML, `.env`, INI) that defines repeatable settings per environment — it gives you nested property access with dot notation. Use `$CliArgs()` for one-off overrides passed at deploy time — values that change between deploys without file changes. `$CliArgs()` is well suited for CI pipeline parameters and ad-hoc flags.

### What Git properties does $GitInfo provide?

`$GitInfo(property)` reads a named property from Stacktape's Git metadata. If you pass an invalid property name, the error message lists all valid arguments. The directive is lazy-loaded — it only accesses Git information when actually referenced in the config.

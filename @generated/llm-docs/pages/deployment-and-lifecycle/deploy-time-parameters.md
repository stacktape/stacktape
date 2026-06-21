# Deploy-Time Parameters

Deploy-time parameters make a single Stacktape configuration work across multiple stages, regions, and deployment contexts. Built-in [directives](/configuration/directives) like `$Stage()`, `$CliArgs()`, and `$Secret()` inject context-dependent values when you run [`stacktape deploy`](/cli/deploy). In TypeScript configs, `defineConfig` accepts a function, so you can use standard TypeScript conditionals and helpers alongside directive strings.

## TypeScript programmatic config

The `defineConfig` wrapper lets you write your Stacktape configuration as a TypeScript function. For string-valued config properties, use deployment context directives such as `$Stage()`, `$Region()`, `$AwsAccountId()`, and `$Profile()`. Because the config is a TypeScript function, you can use standard language features like conditionals and helper functions alongside directive strings.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    memory: 2048,
    environment: {
      STAGE: '$Stage()',
      REGION: '$Region()',
      LOG_LEVEL: "$CliArgs('logLevel', 'debug')"
    }
  });

  return { resources: { api } };
});
```


Because `defineConfig` accepts a TypeScript function, you can use conditionals and helper functions alongside directive strings. For string values that must resolve during CloudFormation stack creation (like [secrets](/configuration/secrets) or [resource references](/configuration/referenceable-parameters)), use directive strings instead.

## Directive syntax

Directives are string expressions that Stacktape resolves during deployment. They follow the pattern `$DirectiveName(param1, param2)`. A directive like `$Stage()` can be used as a standalone property value, or combined with other values using `$Format()`.

Parsed file properties can be accessed with property notation — for example, `$File('./config.json').database.host`.

### Resolution phases

Directives resolve in one of two phases, depending on when the value becomes available.

**Config-time directives** resolve during CLI execution, before the CloudFormation template is generated. The directive string is replaced with a concrete value (string, number, or object) baked into the template. Config-time directives include `$Stage`, `$Region`, `$CliArgs`, `$File`, `$FileRaw`, `$Format`, `$GitInfo`, `$AwsAccountId`, `$Profile`, `$StackOutput`, `$Var`, and `$This`.

**Runtime directives** (referred to as CloudFormation-time directives) emit values that CloudFormation resolves during stack creation. Several of them also define local resolver behavior used by local workflows such as [`stacktape dev`](/local-development/dev-mode-overview). These include intrinsic functions (`$CfFormat()` emits `Sub`, `$CfStackOutput()` emits `ImportValue`), dynamic references (`$Secret()` and `$SsmParam()` emit Secrets Manager and SSM dynamic references), and resource attribute lookups (`$ResourceParam()` and `$CfResourceParam()`). Use these for values that depend on resources being created — database endpoints, secrets, or cross-resource references. Runtime directives include `$Secret`, `$SsmParam`, `$ResourceParam`, `$CfResourceParam`, `$CfFormat`, and `$CfStackOutput`.

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
    environment: {
      STAGE: '$Stage()',
      REGION: '$Region()',
      ACCOUNT_ID: '$AwsAccountId()'
    }
  });

  return { resources: { api } };
});
```


Your application code reads these from `process.env.STAGE`, `process.env.REGION`, etc. The `$Stage()` directive is by far the most common — it lets runtime code adjust logging, feature flags, or service endpoints based on the deployment stage.

## Custom CLI arguments

The `$CliArgs()` directive reads custom values passed at the command line. It accepts two parameters: the argument name and an optional default value. When the named argument is not found, `$CliArgs()` returns the default value (or `undefined` if no default is provided). Internally, `$CliArgs()` reads values from Stacktape CLI arguments and additional arguments made available to the command.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: {
      LOG_LEVEL: "$CliArgs('logLevel', 'info')",
      API_VERSION: "$CliArgs('apiVersion', 'v1')"
    }
  });

  return { resources: { api } };
});
```


Always provide a default for values your config depends on. If no matching argument is found and no default is specified, the directive resolves to `undefined`.


> **Tip:** `$CliArgs()` reads values from Stacktape CLI arguments and additional command arguments. Use the dedicated directives (`$Stage()`, `$Region()`) for the deployment stage and AWS region — they are clearer and purpose-built. Reserve `$CliArgs()` for custom arguments.


## External configuration files

The `$File()` directive loads and parses structured data from external files at config-time. It supports `.env`, JSON, YAML, or INI files. Parsed properties can be accessed with property notation: `$File('./config.json').database.host`.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: {
      API_ENDPOINT: "$File('./config/settings.json').apiEndpoint",
      CACHE_TTL: "$File('./config/settings.json').cacheTtl"
    }
  });

  return { resources: { api } };
});
```


File paths resolve relative to the working directory. If the file format is not one of the supported types (`.env`, JSON, YAML, or INI), `$File()` throws an error and suggests using `$FileRaw()` instead. The loaded file is automatically parsed and its properties can be accessed like `$File("myfile.json").myProperty`.

**`$FileRaw()`** loads a file's raw content as a string without parsing. Use it for plain text, HTML templates, or any format that `$File()` does not support.

## Git metadata

The `$GitInfo()` directive provides metadata from the current Git repository at config-time. Pass a property name supported by Stacktape's Git metadata — if the name is invalid, the error message lists all valid arguments.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: {
      GIT_COMMIT: "$GitInfo('commit')",
      GIT_BRANCH: "$GitInfo('branch')"
    }
  });

  return { resources: { api } };
});
```


The `$GitInfo()` directive is marked as lazy-loaded in Stacktape's directive implementation — it only accesses Git information when the directive is actually referenced in the config.

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
    environment: {
      APP_DOMAIN: "$Format('https://api-{}.example.com', '$Stage()')",
      DB_NAME: "$Format('myapp_{}', '$Stage()')"
    }
  });

  return { resources: { api } };
});
```


Use `$Format()` to compose strings from multiple directive values. For example, `$Format('api-{}-endpoint', '$Stage()')` produces `api-production-endpoint` when deployed to the `production` stage.

### $CfFormat

`$CfFormat()` produces a CloudFormation `Sub` expression that resolves during stack creation. Use it when composing strings that include CloudFormation-time values like [`$ResourceParam()`](/configuration/referenceable-parameters) references. For config-time values, prefer `$Format()` — it produces simpler templates.

During local resolution, `$CfFormat()` replaces `{}` placeholders with the values passed to the directive.

## Cross-stack references

Two directives read outputs exported from other CloudFormation stacks. Both accept the full stack name, the output name, and an optional region argument. The referenced output must be exported from the source stack.

### $StackOutput

`$StackOutput()` fetches an exported stack output at config-time. The value is resolved by the CLI and baked into the template as a static string. Use it when you want a snapshot of the value at deploy time. `$StackOutput()` also accepts an optional third argument — the AWS region — letting you read an exported output from a stack in a different region: `$StackOutput('shared-infra-production', 'VpcId', 'us-east-1')`.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: {
      SHARED_API_URL: "$StackOutput('shared-infra-production', 'ApiUrl')"
    }
  });

  return { resources: { api } };
});
```


The directive expects the full CloudFormation stack name. Stacktape's error hint describes full names as `{stackName}-{stage}`. The referenced stack must be deployed and have the specified output exported. Only exported outputs can be referenced — if the output exists but is not exported, the directive throws an error with instructions to export it first.

### $CfStackOutput

`$CfStackOutput()` validates that the named output exists and is exported on the referenced stack, then emits a CloudFormation `ImportValue` reference for that export. Like `$StackOutput()`, it accepts an optional third argument for the region — Stacktape uses the region to look up and validate the source stack output. Because `$CfStackOutput()` emits an `ImportValue` intrinsic, AWS CloudFormation import/export rules apply to the deployed reference. Use `$StackOutput()` when you need a CLI-time snapshot instead, or when CloudFormation `ImportValue` constraints (such as cross-region limitations) are not satisfied in the target deployment context.

## Secrets and SSM parameters

For sensitive values, use CloudFormation-time directives that resolve during stack creation.

**`$Secret()`** references a value stored in AWS Secrets Manager. Stacktape looks up the secret during deployment to validate the reference and pin the current version, then writes a Secrets Manager dynamic reference into the template rather than plaintext. For JSON secrets, reference a top-level key by appending it after the secret name: `$Secret('mySecret.apiKey')`. If a secret does not exist, the directive throws an error with a hint to create it using [`stacktape secret:create`](/cli/secret-create). See [Secrets](/configuration/secrets) for the full guide.

**`$SsmParam()`** references a value stored in AWS Systems Manager Parameter Store. It uses a secure dynamic reference (`ssm-secure`) for `SecureString` parameters and a standard SSM dynamic reference for other parameter types. The parameter version is pinned at deploy time to produce a deterministic reference.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    environment: {
      DB_PASSWORD: "$Secret('dbPassword')",
      STRIPE_KEY: "$Secret('stripeConfig.apiKey')",
      FEATURE_CONFIG: "$SsmParam('/myapp/feature-config')"
    }
  });

  return { resources: { api } };
});
```


## Resource references

Two runtime directives reference outputs and attributes of resources within your stack. These are the primary mechanism for wiring resources together — passing a database endpoint to a Lambda function, reading a bucket name, or accessing any [referenceable parameter](/configuration/referenceable-parameters).

### $ResourceParam

`$ResourceParam()` takes a Stacktape resource name and a parameter name, and returns that resource's referenceable parameter value. If the resource or parameter does not exist, Stacktape throws an error listing the valid options. During local resolution (e.g. [`stacktape dev`](/local-development/dev-mode-overview)), it reads from the deployed stack overview.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging, Bucket } from 'stacktape';
export default defineConfig(() => {
  const uploads = new Bucket({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    connectTo: [uploads],
    environment: {
      BUCKET_ARN: "$ResourceParam('uploads', 'arn')"
    }
  });

  return { resources: { uploads, api } };
});
```


Use `$ResourceParam()` when you need to reference a Stacktape resource's output in a property that is not covered by `connectTo` auto-injection — for example, composing a custom connection string with `$CfFormat()`. See [Referenceable parameters](/configuration/referenceable-parameters) for the full list of parameters each resource type exposes.

### $CfResourceParam

`$CfResourceParam()` operates at the CloudFormation level. It takes a raw CloudFormation logical resource name (not a Stacktape resource name) and a CloudFormation attribute, then emits a `GetAtt` or `Ref` intrinsic. Use it when you need to reference a CloudFormation resource attribute that is not exposed as a Stacktape referenceable parameter — for example, when working with [raw CloudFormation resources](/resources/advanced/raw-cloudformation-resources) or [CDK constructs](/resources/advanced/aws-cdk-constructs). If the attribute is not valid for the resource type, Stacktape throws an error listing the valid attributes. For `AWS::CloudFormation::CustomResource`, Stacktape allows arbitrary attributes because the output shape is not known statically.

## Variables and self-reference

Two config-time directives help reduce duplication and access the raw config structure.

**`$Var()`** returns the `variables` block of your config. Define shared values once in [variables](/configuration/variables-and-reuse) and reference them anywhere: `$Var().myDomain`.

**`$This()`** returns the entire raw config object. Use it for computed values that depend on other parts of the config. Both resolve at config-time — the result is a concrete value baked into the template.

## FAQ

### Can I use directives in any config property?

Config-time directives (like `$Stage()` and `$CliArgs()`) resolve to plain values before the template is built, so they work in any property that accepts the resolved type. `$Secret()` and `$SsmParam()` return CloudFormation dynamic reference strings. `$ResourceParam()` returns the Stacktape resource's referenceable parameter value. `$CfResourceParam()` emits a `GetAtt` or `Ref` intrinsic when the requested CloudFormation attribute is valid for the resource type.

### What happens if a $CliArgs argument is not provided?

If the named argument is not found among the CLI arguments and additional arguments made available to the command, and no default value is specified, `$CliArgs()` resolves to `undefined`. Always provide a default for values your config depends on: `$CliArgs('myArg', 'fallback')`.

### What is the difference between $Format and $CfFormat?

`$Format()` resolves at config-time — the result is a static string in the CloudFormation template. `$CfFormat()` produces a CloudFormation `Sub` expression that resolves during stack creation. Use `$CfFormat()` when composing strings that include CloudFormation-time values like [`$ResourceParam()`](/configuration/referenceable-parameters) references. For everything else, prefer `$Format()`.

### Can I nest directives?

Directive strings can be composed with `$Format()`. For example, `$Format('https://{}.example.com', '$Stage()')` resolves `$Stage()` and inserts the result into the format string. This lets you combine deploy-time context into a single value.

### How do I manage different configurations for development and production?

For string-valued properties, embed `$Stage()` directly or use `$Format()` to compose stage-specific names. Because `defineConfig` accepts a TypeScript function, you can use standard conditionals in the callback for config logic that goes beyond string substitution. For stage-specific external config, use `$File()` to load different settings files. For sensitive values that differ per stage, create separate [secrets](/configuration/secrets) per stage. See [Stages and environments](/configuration/stages-and-environments) for the full guide.

### How do I pass secrets to my application at deploy time?

Use the `$Secret()` directive in environment variables. Stacktape validates the secret and pins the current version during deployment, then writes a Secrets Manager dynamic reference into the CloudFormation template — the plaintext value never appears in the template. Create secrets with [`stacktape secret:create`](/cli/secret-create). See [Secrets](/configuration/secrets) for setup details.

### Should I use directives or TypeScript conditionals for stage-specific config?

Both work. Because `defineConfig` accepts a TypeScript function, you can use conditionals and helper functions alongside directive strings. Directives are embedded in string values and work identically in YAML and TypeScript configs. For simple string substitutions, directives are concise. For more complex config logic, TypeScript conditionals inside the callback are clearer. Most projects use both: callback-level logic for structural decisions, directives for string values.

### Can I reference outputs from a stack in a different AWS region?

Both `$StackOutput()` and `$CfStackOutput()` accept an optional third argument for the AWS region: `$StackOutput('my-stack-production', 'ApiUrl', 'us-east-1')`. The region argument is used when Stacktape looks up and validates the source stack output. `$StackOutput()` fetches the output through the CLI at config-time, so cross-region lookups work. `$CfStackOutput()` emits a CloudFormation `ImportValue`, so AWS CloudFormation import/export rules apply to the emitted reference. The referenced stack must be deployed and have the specified output exported in either case.

### How do CloudFormation-time directives behave during local development?

When Stacktape uses local directive resolution (e.g. during [`stacktape dev`](/local-development/dev-mode-overview)), CloudFormation-time directives use local resolver behavior. `$ResourceParam()` reads from the deployed stack overview — if the referenced value is `undefined` or `null` and `--disableEmulation` is set, it returns a missing-output identifier instead of throwing; without `--disableEmulation`, it throws an error with a hint to use the flag. `$Secret()` fetches the actual secret value from Secrets Manager (using the version ID from the deployed stack output if available) and throws an error if the fetch fails. `$SsmParam()` fetches the parameter value from SSM Parameter Store directly.

### When should I use $File vs $CliArgs for external configuration?

Use `$File()` for structured, version-controlled configuration (JSON, YAML, `.env`, INI) that defines repeatable settings per environment — it gives you nested property access (e.g. `$File('./config.json').database.host`). Use `$CliArgs()` for one-off overrides passed at deploy time — values that change between deploys without file changes. `$CliArgs()` is well suited for CI pipeline parameters and ad-hoc flags.

### What Git properties does $GitInfo provide?

`$GitInfo(property)` reads a named property from Stacktape's Git metadata. If you pass an invalid property name, the error message lists all valid arguments. The directive is lazy-loaded — it only accesses Git information when actually referenced in the config.

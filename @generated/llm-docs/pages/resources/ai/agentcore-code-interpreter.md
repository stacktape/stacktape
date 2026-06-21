# AgentCore Code Interpreter

The AgentCore Code Interpreter provisions a sandboxed code execution tool on AWS Bedrock AgentCore for use by [AgentCore Runtime](/resources/ai/agentcore-runtime) agents. Wire it to a runtime with a single `useCodeInterpreter` reference. For details on sandbox capabilities, supported languages, and isolation guarantees, refer to the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/).

An `AgentCoreCodeInterpreter` resource has minimal Stacktape configuration: optional `description` and `tags`. The resource exposes `id` and `arn` as [referenceable parameters](/configuration/referenceable-parameters) accessible via [`$ResourceParam`](/configuration/directives).

## When to use

Use a code interpreter when your [AgentCore Runtime](/resources/ai/agentcore-runtime) needs an AWS-managed code execution tool. Common AI-agent patterns include data analysis, calculations, and file transformations — specific sandbox capabilities depend on the AWS Bedrock AgentCore environment. Refer to the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) for supported languages and runtime details.

Typical use cases:

- **Data analysis agents** that process datasets and compute metrics
- **Math and science assistants** that run calculations or simulations
- **Report generation agents** that transform raw data into outputs
- **Code tutoring agents** that need a managed execution environment

## When NOT to use

Skip the code interpreter if your agent only needs to call APIs or query databases — [`connectTo`](/configuration/connecting-resources) and standard environment variables handle that without a sandbox. If you need a persistent, long-running compute environment (not per-request execution), use a [worker service](/resources/compute/worker-service) or [batch job](/resources/compute/batch-job) instead. For browser-based interactions (scraping, testing, screenshots), use [AgentCore Browser](/resources/ai/agentcore-browser).

## Basic example

A code interpreter resource requires almost no configuration. The real value comes from wiring it to an [AgentCore Runtime](/resources/ai/agentcore-runtime).


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreCodeInterpreter } from 'stacktape';
export default defineConfig(() => {
  const codeInterpreter = new AgentCoreCodeInterpreter({
    description: 'Sandboxed runtime for data analysis and chart generation'
  });

  return {
    resources: { codeInterpreter }
  };
});
```


In Stacktape configs, the documented attachment path is `useCodeInterpreter` on [AgentCore Runtime](/resources/ai/agentcore-runtime). Most Stacktape projects create the code interpreter alongside a runtime that references it.

## Examples

### Runtime with code interpreter

Set `useCodeInterpreter` on an [AgentCore Runtime](/resources/ai/agentcore-runtime) to the name of the `AgentCoreCodeInterpreter` resource you return in `resources`. The `AgentCoreRuntimeProps` type accepts this string reference as the runtime's code-interpreter attachment field.

The code interpreter exposes `id` and `arn` as [referenceable parameters](/configuration/referenceable-parameters). If your application code needs the provisioned ID, use [`$ResourceParam`](/configuration/directives) to pass it as an environment variable — for example, `$ResourceParam('analysisCodeInterpreter', 'id')`.

AgentCore Runtime uses the same [container packaging modes](/packaging/overview) as other Stacktape container workloads: Stacktape image buildpack, custom Dockerfile, prebuilt image, Nixpacks, and external buildpack. The examples below use `CustomDockerfilePackaging` because agent runtimes often need explicit system dependencies. The `buildContextPath` property points to the Docker build context relative to your `stacktape.ts` — adjust `'./'` if your Dockerfile is in a different directory.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreCodeInterpreter,
  AgentCoreRuntime,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const analysisCodeInterpreter = new AgentCoreCodeInterpreter({
    description: 'Sandboxed code execution for data analysis'
  });

  const analystAgent = new AgentCoreRuntime({
    description: 'Data analyst agent that explores datasets and generates reports.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useCodeInterpreter: 'analysisCodeInterpreter',
    endpoints: [{ name: 'production', description: 'Main analyst endpoint.' }],
    environment: [
      { name: 'AI_MODEL', value: 'eu.amazon.nova-micro-v1:0' },
      { name: 'CODE_INTERPRETER_ID', value: "$ResourceParam('analysisCodeInterpreter', 'id')" }
    ]
  });

  return {
    resources: {
      analysisCodeInterpreter,
      analystAgent
    }
  };
});
```


The `useCodeInterpreter: 'analysisCodeInterpreter'` value matches the key used in the returned `resources` object. The `$ResourceParam('analysisCodeInterpreter', 'id')` directive resolves to the provisioned code interpreter's ID at deploy time, making it available to your agent code as the `CODE_INTERPRETER_ID` environment variable.

### Runtime with code interpreter, memory, and storage

A realistic data analyst agent combines the code interpreter with [AgentCore Memory](/resources/ai/agentcore-memory) for conversation context and an [S3 bucket](/resources/storage/s3-bucket) for persisting generated reports.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreCodeInterpreter,
  AgentCoreMemory,
  AgentCoreRuntime,
  Bucket,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const analysisMemory = new AgentCoreMemory({
    description: 'Stores conversation context and recurring analysis parameters.',
    expirationDays: 90
  });

  const analysisCodeInterpreter = new AgentCoreCodeInterpreter({
    description: 'Sandboxed code execution for dataframe analysis and chart generation.'
  });

  const reportsBucket = new Bucket({});

  const analystAgent = new AgentCoreRuntime({
    description: 'Data analyst agent for CSV exploration, KPI summaries, and report generation.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'analysisMemory',
    useCodeInterpreter: 'analysisCodeInterpreter',
    connectTo: ['reportsBucket'],
    endpoints: [{ name: 'production', description: 'Main data analyst endpoint.' }],
    lifecycle: {
      idleRuntimeSessionTimeout: 3600,
      maxLifetime: 28800
    },
    environment: [
      { name: 'AI_MODEL', value: 'eu.amazon.nova-micro-v1:0' },
      { name: 'CODE_INTERPRETER_ID', value: "$ResourceParam('analysisCodeInterpreter', 'id')" },
      { name: 'MEMORY_ID', value: "$ResourceParam('analysisMemory', 'id')" }
    ]
  });

  return {
    resources: {
      analysisMemory,
      analysisCodeInterpreter,
      reportsBucket,
      analystAgent
    }
  };
});
```


The `connectTo: ['reportsBucket']` grants the runtime read/write/delete object permissions on the S3 bucket and injects `STP_REPORTS_BUCKET_NAME` and `STP_REPORTS_BUCKET_ARN` as environment variables. The `useMemory` and `useCodeInterpreter` properties take the names of the corresponding AgentCore resources defined in your `resources` object. To access their provisioned IDs in your application code, pass them as explicit environment variables using `$ResourceParam` as shown above.

The `lifecycle` property exposes `idleRuntimeSessionTimeout` and `maxLifetime` from `AgentCoreRuntimeLifecycleConfig`. See [AgentCore Runtime](/resources/ai/agentcore-runtime) for details on lifecycle configuration.

## Tags

Use `tags` to configure CloudFormation tags on the AgentCore Code Interpreter resource. Tags are useful for cost tracking, organizational grouping, or access-control policies.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreCodeInterpreter } from 'stacktape';
export default defineConfig(() => {
  const codeInterpreter = new AgentCoreCodeInterpreter({
    description: 'Production code interpreter for analyst agents',
    tags: [
      { name: 'team', value: 'ai-platform' },
      { name: 'cost-center', value: 'data-analytics' }
    ]
  });

  return {
    resources: { codeInterpreter }
  };
});
```


Each tag has a `name` (1-128 characters) and a `value` (1-256 characters). When you configure `stackConfig.tags`, Stacktape automatically includes `projectName`, `stage`, and `stackName` tags alongside your custom tags.

## Overrides

Use [`overrides`](/configuration/overrides-and-escape-hatches) only when you need to modify the generated CloudFormation resources directly. Use [`stacktape stack-info --detailed`](/cli/info-stack) to find logical IDs of child resources, then target them by name in the `overrides` block. This is an escape hatch — most configurations do not need it.

## Referenceable parameters

The AgentCore Code Interpreter exposes the following parameters for use with the [`$ResourceParam` directive](/configuration/directives):

| Parameter | Description |
|---|---|
| `id` | The provisioned code interpreter's resource ID |
| `arn` | The code interpreter's ARN |

Reference these parameters elsewhere in your config. For a code interpreter resource named `myCodeInterpreter`:

```
$ResourceParam('myCodeInterpreter', 'id')
```

This is particularly useful for passing the code interpreter's ID into a runtime's environment variables, as shown in the [examples above](#examples).

## API Reference


## API Reference: `AgentCoreCodeInterpreterProps`
```typescript
import type { CloudformationTag } from 'stacktape';

type AgentCoreCodeInterpreterProps = {
  description?: string;
  tags?: Array<CloudformationTag>;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `description` | no | `string` | - | - |
| `tags` | no | `Array<CloudformationTag>` | - | - |


## FAQ

### What does the code interpreter actually do?

The AgentCore Code Interpreter is a managed code execution tool provisioned through AWS Bedrock AgentCore. An [AgentCore Runtime](/resources/ai/agentcore-runtime) references it via `useCodeInterpreter` to give agents code execution capabilities. For details on supported languages, pre-installed libraries, and sandbox behavior, refer to the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/).

### How does the code interpreter differ from a Lambda function?

A [Lambda function](/resources/compute/lambda-function) is a general-purpose compute resource where you deploy your own application code with full control over the runtime environment. The AgentCore Code Interpreter is a managed tool provisioned through AWS Bedrock AgentCore — an [AgentCore Runtime](/resources/ai/agentcore-runtime) references it via `useCodeInterpreter` to give agents code execution capabilities. Use Lambda for your application logic; use the code interpreter when an AgentCore Runtime needs AWS-managed code execution. For execution model details, supported languages, and sandbox behavior, refer to the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/).

### Can I use the code interpreter without an AgentCore Runtime?

You can provision a standalone `AgentCoreCodeInterpreter` resource, but the documented attachment path is `useCodeInterpreter` on [AgentCore Runtime](/resources/ai/agentcore-runtime). Set it to the resource name of the code interpreter, and use `$ResourceParam` to pass the interpreter's `id` into your agent's environment if needed.

### Is the code execution sandboxed?

The code interpreter is intended for sandboxed code execution managed by AWS Bedrock AgentCore. For details on isolation guarantees, network access, and resource limits, refer to the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/).

### How much does AgentCore Code Interpreter cost?

No AgentCore Code Interpreter pricing data is present in the Stacktape source files. Pricing for AWS Bedrock AgentCore tools is determined by AWS and varies by region. Check the [AWS Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/) for current rates.

### Can multiple runtimes share the same code interpreter?

An [AgentCore Runtime](/resources/ai/agentcore-runtime) can reference a code interpreter by resource name through `useCodeInterpreter`. The Stacktape types do not document sharing semantics or session isolation when multiple runtimes reference the same code interpreter. Check the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) for details on multi-runtime usage.

### How do I access the code interpreter's ID in my agent code?

Use [`$ResourceParam`](/configuration/directives) to pass the ID as an environment variable on the [AgentCore Runtime](/resources/ai/agentcore-runtime). For a code interpreter named `myInterpreter`, add an environment entry like `{ name: 'CODE_INTERPRETER_ID', value: "$ResourceParam('myInterpreter', 'id')" }`. At deploy time, Stacktape resolves this to the provisioned ID. Your agent code reads it from `process.env.CODE_INTERPRETER_ID` (or the equivalent in your language).

### What other tools can I attach to an AgentCore Runtime?

`AgentCoreRuntimeProps` includes four optional tool-attachment properties: `useMemory`, `useGateway`, `useBrowser`, and `useCodeInterpreter`, each accepting the name of the corresponding AgentCore resource. See the dedicated pages for [AgentCore Memory](/resources/ai/agentcore-memory), [AgentCore Gateway](/resources/ai/agentcore-gateway), and [AgentCore Browser](/resources/ai/agentcore-browser).

### When should I use a code interpreter vs a batch job for data processing?

Use the code interpreter when an [AgentCore Runtime](/resources/ai/agentcore-runtime) needs AWS Bedrock AgentCore's managed code execution tool. For execution model details (session behavior, supported languages, sandbox limits), refer to the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/). For scheduled or long-running jobs that run a packaged workload to completion, see [batch jobs](/resources/compute/batch-job) instead — batch jobs are Stacktape-managed compute with full control over packaging, environment, and scaling.

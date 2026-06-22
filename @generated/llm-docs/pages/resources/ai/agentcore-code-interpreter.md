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
    environment: {
      AI_MODEL: 'eu.amazon.nova-micro-v1:0',
      CODE_INTERPRETER_ID: "$ResourceParam('analysisCodeInterpreter', 'id')"
    }
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

### MCP code tutoring agent with JWT auth

This example shows a different agent pattern: a code tutoring agent exposed via the MCP protocol, protected by a JWT authorizer. The `protocol` property on [AgentCore Runtime](/resources/ai/agentcore-runtime) accepts `'HTTP'`, `'MCP'`, `'A2A'`, or `'AGUI'`. The `authorizer` property accepts a JWT configuration with a discovery URL and optional audience/client/scope filters.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreCodeInterpreter,
  AgentCoreRuntime,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const tutorCodeInterpreter = new AgentCoreCodeInterpreter({
    description: 'Sandboxed execution for student code submissions',
    tags: [{ name: 'team', value: 'education' }]
  });

  const tutorAgent = new AgentCoreRuntime({
    description: 'Code tutoring agent that runs student submissions and explains results.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    protocol: 'MCP',
    useCodeInterpreter: 'tutorCodeInterpreter',
    authorizer: {
      discoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
      allowedAudience: ['tutor-api']
    },
    endpoints: [{ name: 'tutor', description: 'MCP endpoint for coding assistants.' }],
    environment: { AI_MODEL: 'eu.amazon.nova-micro-v1:0' }
  });

  return {
    resources: {
      tutorCodeInterpreter,
      tutorAgent
    }
  };
});
```


The `protocol: 'MCP'` setting exposes the agent as an MCP-compatible tool server, useful for integration with coding assistants. The `authorizer` block configures JWT validation — requests without a valid token matching the `discoveryUrl` issuer and `allowedAudience` are rejected. Tags on the code interpreter resource propagate as CloudFormation tags for cost attribution.

## Tags

Use `tags` to add CloudFormation tags to the AgentCore Code Interpreter resource. Teams commonly use tags for grouping and cost attribution.


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

The `AgentCoreCodeInterpreter` resource definition accepts a resource-level [`overrides`](/configuration/overrides-and-escape-hatches) property for modifying generated CloudFormation resources directly. Use [`stacktape info:stack`](/cli/info-stack) to find logical IDs of child resources, then target them by name in the `overrides` block. This is an escape hatch — most configurations do not need it.

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

### How does the code interpreter differ from a Lambda function?

A [Lambda function](/resources/compute/lambda-function) is a general-purpose compute resource where you deploy your own application code with full control over the runtime environment. The AgentCore Code Interpreter is a managed tool provisioned through AWS Bedrock AgentCore — an [AgentCore Runtime](/resources/ai/agentcore-runtime) references it via `useCodeInterpreter` to give agents code execution capabilities. Use Lambda for your application logic; use the code interpreter when an AgentCore Runtime needs AWS-managed code execution. For execution model details, supported languages, and sandbox behavior, refer to the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/).

### Can I use the code interpreter without an AgentCore Runtime?

You can provision a standalone `AgentCoreCodeInterpreter` resource, but the documented attachment path is `useCodeInterpreter` on [AgentCore Runtime](/resources/ai/agentcore-runtime). Set it to the resource name of the code interpreter, and use `$ResourceParam` to pass the interpreter's `id` into your agent's environment if needed.

### How much does AgentCore Code Interpreter cost?

Stacktape adds no markup — the code interpreter is a managed AWS Bedrock AgentCore tool, so pricing is determined by AWS and varies by region. Check the [AWS Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/) for current rates.

### How do I access the code interpreter's ID in my agent code?

Use [`$ResourceParam`](/configuration/directives) to pass the ID as an environment variable on the [AgentCore Runtime](/resources/ai/agentcore-runtime). For a code interpreter named `myInterpreter`, add an environment entry like `{ name: 'CODE_INTERPRETER_ID', value: "$ResourceParam('myInterpreter', 'id')" }`. At deploy time, Stacktape resolves this to the provisioned ID. Your agent code reads it from `process.env.CODE_INTERPRETER_ID` (or the equivalent in your language).

### What other tools can I attach to an AgentCore Runtime?

`AgentCoreRuntimeProps` includes four optional tool-attachment properties: `useMemory`, `useGateway`, `useBrowser`, and `useCodeInterpreter`, each accepting the name of the corresponding AgentCore resource. See the dedicated pages for [AgentCore Memory](/resources/ai/agentcore-memory), [AgentCore Gateway](/resources/ai/agentcore-gateway), and [AgentCore Browser](/resources/ai/agentcore-browser).

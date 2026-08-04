# AgentCore Memory

AgentCore Memory is a managed persistent memory store for [AgentCore Runtime](/resources/ai/agentcore-runtime) agents. It lets AI agents store and recall information across sessions — conversation history, user preferences, and accumulated context — without managing a separate database. Define it as an `AgentCoreMemory` resource in your Stacktape config and reference it from an [AgentCore Runtime](/resources/ai/agentcore-runtime).

## When to use

AgentCore Memory is the right choice when your AI agents need cross-session persistence integrated directly with an [AgentCore Runtime](/resources/ai/agentcore-runtime). Typical scenarios:

- **Conversational agents** that recall prior exchanges with a user across separate sessions.
- **Support agents** that track customer preferences, prior issues, and handoff context over time.
- **Knowledge-accumulating agents** that build up domain understanding through ongoing interactions.

AgentCore Memory supports optional expiration settings and customer-managed encryption. It also accepts configurable memory strategies whose shape is defined by the AWS Bedrock AgentCore API.

## When NOT to use

AgentCore Memory is scoped to the AgentCore ecosystem. Choose a different resource when your needs fall outside that scope.

- **General-purpose database**: Use a [DynamoDB table](/resources/databases/dynamodb) or a [relational database](/resources/databases/relational-database) for structured application data.
- **File or blob storage**: Use an [S3 bucket](/resources/storage/s3-bucket).
- **Single-session agent context**: If your agent's state lives entirely within one request or session, manage it in-process or pass it through the conversation payload — no memory resource needed.
- **Non-AgentCore compute**: The provided types only document direct AgentCore Memory wiring through `AgentCoreRuntimeProps.useMemory`; they do not document `connectTo` environment variable injection for AgentCore Memory. If another workload needs to call Bedrock AgentCore directly, pass `id` or `arn` with [`$ResourceParam()`](/configuration/directives) and configure the required IAM permissions explicitly.

## Basic example

A minimal AgentCore Memory requires no properties — all fields are optional.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreMemory } from 'stacktape';
export default defineConfig(() => {
  const agentMemory = new AgentCoreMemory({});

  return {
    resources: { agentMemory }
  };
});
```


## Connecting to an AgentCore Runtime

`AgentCoreRuntimeProps` exposes an optional `useMemory` string. The examples below set it to the name of an `AgentCoreMemory` resource.

The runtime example below uses `CustomDockerfilePackaging`, but AgentCore Runtime supports the same container packaging modes as other Stacktape container workloads: [Stacktape buildpack](/packaging/containers/stacktape-buildpack), [custom Dockerfile](/packaging/containers/custom-dockerfile), [prebuilt image](/packaging/containers/prebuilt-image), [Nixpacks](/packaging/containers/nixpacks), and [external buildpack](/packaging/containers/external-buildpack).

AgentCore Memory exposes `id` and `arn` as [referenceable parameters](/configuration/referenceable-parameters). To pass the memory ID into your runtime container, add an explicit environment variable using the [`$ResourceParam()` directive](/configuration/directives):


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreMemory,
  AgentCoreRuntime,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const supportMemory = new AgentCoreMemory({
    description: 'Stores customer interaction history and preferences.',
    expirationDays: 60
  });

  const supportAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'supportMemory',
    environment: {
      AI_MODEL: 'eu.amazon.nova-micro-v1:0',
      MEMORY_ID: "$ResourceParam('supportMemory', 'id')"
    }
  });

  return {
    resources: { supportMemory, supportAgent }
  };
});
```


In a Node.js runtime, for example, read the memory ID from the environment variable:

```typescript
const memoryId = process.env.MEMORY_ID;
```


> **Info:** `AgentCoreRuntimeProps` exposes `useMemory` as an optional string. Set it to the name of your `AgentCoreMemory` resource. To access the memory ID in your application code, pass it explicitly through `environment` using `$ResourceParam()` as shown above.


## Memory expiration

`AgentCoreMemoryProps` exposes two optional numeric expiration-related properties: `expirationDays` and `eventExpiryDuration`. The provided Stacktape types do not document their accepted ranges, defaults, or relationship — consult the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) for how they interact and what values they accept.

The example below sets `expirationDays`:


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreMemory } from 'stacktape';
export default defineConfig(() => {
  const agentMemory = new AgentCoreMemory({
    expirationDays: 90
  });

  return {
    resources: { agentMemory }
  };
});
```


`eventExpiryDuration` is a separate optional numeric property also related to expiration. The precise relationship between `expirationDays` and `eventExpiryDuration` is not specified at the Stacktape config layer — consult the [AWS Bedrock AgentCore API documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) for how they interact.


> **Tip:** Choose a retention window that balances recall usefulness against storage growth. Shorter windows suit transient conversational context; longer windows work for agents that accumulate user preferences or project knowledge over time.


## Memory strategies

The `memoryStrategies` property accepts an array of strategy objects. The Stacktape TypeScript type for `memoryStrategies` is `any[]`, so the provided config types do not describe the inner shape. Consult the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) for the available strategy types, required fields, and whether multiple strategies can be combined on a single memory resource.

## Encryption

AgentCore Memory accepts an optional `encryptionKeyArn` property for specifying a customer-managed KMS key. Provide the ARN of a KMS key from your AWS account when your compliance requirements mandate customer-managed encryption.

`AgentCoreMemoryProps` exposes `encryptionKeyArn` as an optional string. The provided Stacktape type does not describe default encryption behavior or key requirements when this property is omitted — consult the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) for encryption defaults. Customer-managed KMS keys are typically used when compliance processes require encryption key auditing and rotation control. Replace the placeholder ARN below with your own KMS key ARN.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreMemory } from 'stacktape';
export default defineConfig(() => {
  const agentMemory = new AgentCoreMemory({
    encryptionKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/your-key-id',
    expirationDays: 90
  });

  return {
    resources: { agentMemory }
  };
});
```


## Examples

### Encrypted memory with custom retention

A memory resource configured with a customer-managed KMS key, a 180-day retention window, and tags. This pattern suits compliance-sensitive workloads where encryption key auditing is required. Replace the placeholder KMS ARN with your own key.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreMemory } from 'stacktape';
export default defineConfig(() => {
  const secureMemory = new AgentCoreMemory({
    description: 'Encrypted memory for a compliance-sensitive agent.',
    encryptionKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/your-key-id',
    expirationDays: 180,
    tags: [{ name: 'compliance', value: 'hipaa' }]
  });

  return {
    resources: { secureMemory }
  };
});
```


### AgentCore Runtime with dedicated memory

A complete config with an `AgentCoreMemory` wired to an [AgentCore Runtime](/resources/ai/agentcore-runtime) via `useMemory`. The memory ID is passed into the runtime container as an environment variable using [`$ResourceParam()`](/configuration/directives).


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreMemory,
  AgentCoreRuntime,
  StacktapeImageBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const chatMemory = new AgentCoreMemory({
    description: 'Conversation history for the chat agent.',
    expirationDays: 30
  });

  const chatAgent = new AgentCoreRuntime({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/agent.ts'
    }),
    useMemory: 'chatMemory',
    environment: { MEMORY_ID: "$ResourceParam('chatMemory', 'id')" }
  });

  return {
    resources: { chatMemory, chatAgent }
  };
});
```


## Referenceable parameters

AgentCore Memory exposes `id` and `arn` as referenceable parameters, accessible via the [`$ResourceParam()` directive](/configuration/directives).

| Parameter | Description |
|---|---|
| `id` | The unique memory ID assigned by AWS. Typically used to interact with the memory through the Bedrock AgentCore SDK. |
| `arn` | The full ARN of the memory resource. Typically used when referencing the memory in IAM policies or cross-stack outputs. |

Reference these from other parts of your configuration. For example, pass the memory ID to a runtime container:

```typescript
{ name: 'MEMORY_ID', value: "$ResourceParam('myMemory', 'id')" }
```

Or pass the ARN to a [deployment script](/resources/advanced/deployment-scripts):

```typescript
{ name: 'MEMORY_ARN', value: "$ResourceParam('myMemory', 'arn')" }
```

## API Reference


### Definition: `AgentCoreMemoryProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/agentcore` with definition name `AgentCoreMemoryProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `description` | no | `string` | - |
| `encryptionKeyArn` | no | `string` | - |
| `eventExpiryDuration` | no | `number` | - |
| `expirationDays` | no | `number` | - |
| `memoryStrategies` | no | `Array<unknown>` | - |
| `tags` | no | `Array<CloudformationTag>` | - |


## FAQ

### How do I connect AgentCore Memory to an AgentCore Runtime?

Set the `useMemory` property on your [AgentCore Runtime](/resources/ai/agentcore-runtime) to the name of the memory resource defined in your config. This wires the two together, but it does not expose the memory ID to your application code — to read it at runtime, pass it through an explicit environment variable using `$ResourceParam('memoryResourceName', 'id')`. See the [Connecting to an AgentCore Runtime](#connecting-to-an-agentcore-runtime) section for a complete example.

### How do I configure memory strategies?

The `memoryStrategies` property accepts an array of strategy objects, but it is typed as `any[]` in Stacktape — the config surface does not validate or document the inner shape. The strategy types, required fields, and how they extract and consolidate information are defined entirely by the AWS Bedrock AgentCore API. Consult the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) for the available strategies and their behavior.

### Can I encrypt AgentCore Memory with my own KMS key?

Yes. Set the `encryptionKeyArn` property to the ARN of a customer-managed KMS key in your AWS account when your compliance process requires a specific key. When omitted, no customer-managed key is configured at the Stacktape config layer. Customer-managed keys are typically needed for encryption key auditing and rotation control in regulated industries.

### AgentCore Memory vs DynamoDB for agent state — which should I use?

AgentCore Memory integrates directly with [AgentCore Runtime](/resources/ai/agentcore-runtime) through the `useMemory` property and supports configurable memory strategies for organizing recalled information. [DynamoDB](/resources/databases/dynamodb) is a general-purpose key-value store that works with any compute resource and gives you full schema control. Use AgentCore Memory when your agent runs on AgentCore Runtime and you want managed memory; use DynamoDB when you need broader flexibility or aren't using AgentCore.

### How do I delete or reset stored memories?

The `AgentCoreMemoryProps` type does not expose selective deletion of individual memory entries. Removing the resource from your config and redeploying, or deleting the stack with [`stacktape delete`](/cli/delete), follows the standard Stacktape resource deletion workflow. For data lifecycle details — whether stored memory data is permanently deleted, retained, or recoverable — consult the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/).

### Can multiple AgentCore Runtimes reference the same memory resource?

The `useMemory` property on `AgentCoreRuntimeProps` accepts a string. The Stacktape type does not restrict `useMemory` to a single runtime, but the provided types do not document concurrency, isolation, or sharing semantics. Consult the [AWS Bedrock AgentCore documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/) before pointing multiple runtimes at the same memory resource.

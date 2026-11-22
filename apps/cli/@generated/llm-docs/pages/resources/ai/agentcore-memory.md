# AgentCore Memory

An `agentcore-memory` is an Amazon Bedrock AgentCore Memory store. An agent saves conversation events to it and recalls
them later, also in a new session: what a user asked last week, their preferences, facts the agent extracted. Use it
with an [AgentCore Runtime](/resources/ai/agentcore-runtime).

For your application's own data, use a [DynamoDB table](/resources/databases/dynamodb) or a
[relational database](/resources/databases/relational-database). An agent that only needs context within one session
doesn't need a memory resource.

## Basic example


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreMemory, AgentCoreRuntime, JsBundleImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const agentMemory = new AgentCoreMemory({});

  const agent = new AgentCoreRuntime({
    packaging: new JsBundleImagePackaging({ entryfilePath: './agent/server.ts' }),
    useMemory: 'agentMemory'
  });

  return {
    resources: { agentMemory, agent }
  };
});
```


`useMemory` gives the runtime access to the memory and injects its ID as `STP_AGENTCORE_MEMORY_ID`. Pass it to the
AgentCore SDK when you save and read events:

```typescript
const memoryId = process.env.STP_AGENTCORE_MEMORY_ID!;
```

Another workload, such as a Lambda function, can use the memory through its `id` or `arn`
[parameter](/configuration/referenceable-parameters) with `$ResourceParam()`, plus `iamRoleStatements` for the
`bedrock-agentcore` actions it calls.

## Retention

`eventRetentionDays` sets how long AgentCore keeps raw events before deleting them: 30 days by default, 7 to 365 days
allowed. Keep it short for passing conversational context; make it longer for agents that build up knowledge about a
user over months.

```typescript
new AgentCoreMemory({ eventRetentionDays: 90 })
```

## Memory strategies

Without strategies, the memory stores raw events only. A strategy makes AgentCore extract long-term records from them,
for example facts, summaries or user preferences. `memoryStrategies` is passed to AWS as written, in the CloudFormation
[`MemoryStrategies`](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-bedrockagentcore-memory.html)
format:

```typescript
new AgentCoreMemory({
  memoryStrategies: [
    { SemanticMemoryStrategy: { Name: 'facts', Namespaces: ['/users/{actorId}/facts'] } },
    { UserPreferenceMemoryStrategy: { Name: 'preferences', Namespaces: ['/users/{actorId}/preferences'] } }
  ]
})
```

Stacktape doesn't check the shape; AWS rejects an invalid strategy during the deploy.

## Encryption

AgentCore encrypts the memory at rest. To use your own KMS key, set `encryptionKeyArn`:

```typescript
new AgentCoreMemory({ encryptionKeyArn: 'arn:aws:kms:eu-west-1:123456789012:key/your-key-id' })
```

## Cost

AgentCore Memory bills for events stored and for long-term records extracted and read. See
[AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/).

## Configuration reference


### Definition: `AgentCoreMemoryProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/agentcore` with definition name `AgentCoreMemoryProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `description` | no | `string` | - |
| `encryptionKeyArn` | no | `string` | - |
| `eventRetentionDays` | no | `number` | `30` |
| `memoryStrategies` | no | `Array<unknown>` | - |
| `tags` | no | `Array<CloudformationTag>` | - |


## Referenceable parameters

| Parameter | Value |
|-----------|-------|
| `id` | Memory ID |
| `arn` | Memory ARN |

## Next steps

- [AgentCore Runtime](/resources/ai/agentcore-runtime): the agent that uses the memory.
- [AgentCore Gateway](/resources/ai/agentcore-gateway): give the agent tools.

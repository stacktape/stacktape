# AgentCore Browser

AgentCore Browser is a Stacktape resource for configuring a browser tool on AWS Bedrock AgentCore. An [AgentCore Runtime](/resources/ai/agentcore-runtime) can reference the browser by setting its `useBrowser` property to the browser resource name. An optional `recording` object lets you configure bucket-based session recording for debugging and audit.

## When to use

Use AgentCore Browser when your AI agent needs a managed, sandboxed browser environment. Typical use cases include agents that interact with rendered web pages, agents that need to process web content, and agents that require browser-based tooling beyond simple HTTP requests.

If your agent only needs to call HTTP APIs (REST, GraphQL), skip the browser and use direct HTTP calls or the [AgentCore Gateway](/resources/ai/agentcore-gateway) instead. A managed browser adds overhead that is unnecessary for structured API interactions.

## When NOT to use

AgentCore Browser is not the right fit when your agent does not need a full browser environment. Simpler alternatives are faster, cheaper, and easier to operate.

- **Static API calls** — If the agent only needs to fetch JSON from known endpoints, use HTTP requests directly from your runtime container. A browser adds unnecessary overhead for structured API work.
- **Headless rendering for your own frontend** — AgentCore Browser is designed for agent web interaction, not for server-side rendering of your own app. Use [Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), or other SSR frontend resources instead.
- **Automated UI testing** — If your goal is CI browser testing rather than giving an AgentCore runtime a browser reference, use a dedicated test runner such as Playwright or Cypress.

## Basic example

The simplest AgentCore Browser configuration needs no properties at all. Connect it to an [AgentCore Runtime](/resources/ai/agentcore-runtime) using the runtime's `useBrowser` property, which takes the browser's resource name as a string.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreBrowser,
  AgentCoreRuntime,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const browser = new AgentCoreBrowser({
    description: 'Browser for web research and citation gathering.'
  });

  const agent = new AgentCoreRuntime({
    description: 'Research agent with browser access.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useBrowser: 'browser',
    endpoints: [{ name: 'default' }]
  });

  return {
    resources: { browser, agent }
  };
});
```


`AgentCoreRuntimeProps` includes `useBrowser?: string`. Set it to the key name of your AgentCore Browser resource in the `resources` object — in this example, `'browser'` matches the key used when returning `{ browser, agent }`.

AgentCore Runtime uses the same [container packaging](/packaging/overview) options as other container workloads: Stacktape image buildpack, custom Dockerfile, prebuilt image, Nixpacks, and external buildpack. The examples on this page use `CustomDockerfilePackaging` because agent runtimes often need explicit control over browser and tool dependencies.

## Examples

### Session recording

AgentCore Browser exposes an optional `recording` configuration with `enabled`, `bucketName`, and `prefix` properties. Use it when you want AWS Bedrock AgentCore browser recording configured for this browser resource.

Enable recording during development to debug agent browser behavior. In production, leave recording off unless you need an audit trail. Enabling recording may add storage costs in the configured bucket, so manage retention and access control on that bucket accordingly.


> **Tip:** Most teams start without recording and add it selectively when debugging specific agent behaviors or when compliance requires an audit trail.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreBrowser, Bucket } from 'stacktape';
export default defineConfig(() => {
  const recordingsBucket = new Bucket({});

  const browser = new AgentCoreBrowser({
    description: 'Browser with session recording enabled.',
    recording: {
      enabled: true,
      bucketName: '$ResourceParam("recordingsBucket", "name")',
      prefix: 'sessions/'
    }
  });

  return {
    resources: { recordingsBucket, browser }
  };
});
```


The `recording.bucketName` property takes a bucket name string. In this example, `$ResourceParam("recordingsBucket", "name")` dynamically resolves to the name of the Stacktape-managed `recordingsBucket` resource. You can also pass a hardcoded bucket name if you are using a bucket managed outside your Stacktape stack. See [directives](/configuration/directives) for more on `$ResourceParam`.

See the [API reference](#api-reference) below for the full `recording` object shape.

### Full agent with memory and browser

A realistic setup combines an [AgentCore Memory](/resources/ai/agentcore-memory) for persistent context across sessions with an AgentCore Browser for web interaction, both connected to a single runtime.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreBrowser,
  AgentCoreMemory,
  AgentCoreRuntime,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const researchMemory = new AgentCoreMemory({
    description: 'Stores prior research briefs and follow-up context.',
    expirationDays: 45
  });

  const researchBrowser = new AgentCoreBrowser({
    description: 'Managed browser for source discovery and citation gathering.'
  });

  const researchAgent = new AgentCoreRuntime({
    description: 'Research agent with browser and persistent memory.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'researchMemory',
    useBrowser: 'researchBrowser',
    endpoints: [{ name: 'production', description: 'Main research assistant endpoint.' }],
    lifecycle: {
      idleRuntimeSessionTimeout: 3600,
      maxLifetime: 28800
    },
    environment: [{ name: 'AI_MODEL', value: 'eu.amazon.nova-micro-v1:0' }]
  });

  return {
    resources: {
      researchAgent,
      researchMemory,
      researchBrowser
    }
  };
});
```


`AgentCoreRuntimeProps` exposes `useMemory`, `useGateway`, `useBrowser`, and `useCodeInterpreter` as optional string properties for referencing the corresponding AgentCore resources by name. In this example, `useMemory: 'researchMemory'` and `useBrowser: 'researchBrowser'` match the keys in the returned `resources` object. The `expirationDays` property on `AgentCoreMemory` controls how long memory entries are retained. The `lifecycle` object on `AgentCoreRuntime` tunes session lifetime: `idleRuntimeSessionTimeout` sets how long an idle session persists, and `maxLifetime` caps the total session duration.

## Overrides

AgentCore Browser accepts the standard [overrides](/configuration/overrides-and-escape-hatches) escape hatch for modifying generated CloudFormation child resources. Use dot-notation paths to override specific properties. Find resource logical IDs with [`stacktape info:stack --detailed`](/cli/info-stack).

## Tags

AgentCore Browser accepts `tags` (`CloudformationTag[]`) for adding AWS-level ownership, cost allocation, or audit labels. See the API reference below for the exact tag shape.

## Referenceable parameters

Use [`$ResourceParam()`](/configuration/directives) to reference browser resource values in other parts of your configuration. AgentCore Browser exposes the following parameters:

| Parameter | Description |
|---|---|
| `id` | The ID of the AgentCore Browser resource. |
| `arn` | The ARN of the AgentCore Browser resource. |

## API Reference


## API Reference: `AgentCoreBrowserProps`
```typescript
import type { CloudformationTag } from 'stacktape';

type AgentCoreBrowserProps = {
  description?: string;
  recording?: unknown;
  tags?: Array<CloudformationTag>;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `description` | no | `string` | - | - |
| `recording` | no | `unknown` | - | - |
| `tags` | no | `Array<CloudformationTag>` | - | - |


## FAQ

### How do I connect the browser to my agent runtime?

Set the `useBrowser` property on your [AgentCore Runtime](/resources/ai/agentcore-runtime) to the resource name of your AgentCore Browser. `AgentCoreRuntimeProps` includes `useBrowser?: string`; in your Stacktape config, pass the browser resource name you return from `resources`. For example, if your browser resource is keyed as `researchBrowser`, set `useBrowser: 'researchBrowser'` on the runtime.

### Can I use the browser without enabling recording?

Yes. Recording is entirely optional. You can omit the `recording` property entirely; the source type does not require it on `AgentCoreBrowserProps`. Most development setups start without recording and add it later if debugging or auditing is needed.

### Where are session recordings stored?

The `recording` object on `AgentCoreBrowserProps` accepts `enabled`, `bucketName`, and `prefix`. Use `bucketName` to pass the target bucket name and `prefix` to set the key prefix for recordings. You are responsible for managing the bucket's lifecycle policies and access control. Use [`$ResourceParam()`](/configuration/directives) to reference a Stacktape-managed [Bucket](/resources/storage/s3-bucket) by name, or pass a hardcoded name for an externally managed bucket.

### What is the difference between AgentCore Browser and AgentCore Code Interpreter?

[AgentCore Browser](/resources/ai/agentcore-browser) configures a browser tool resource. [AgentCore Code Interpreter](/resources/ai/agentcore-code-interpreter) configures a code execution tool resource. Use the browser when the agent needs a browser tool; use the code interpreter when the agent needs to compute, transform data, or run scripts. `AgentCoreRuntimeProps` exposes both `useBrowser` and `useCodeInterpreter` as string properties, so a single runtime can reference one of each.

### How much does AgentCore Browser cost?

No concrete AgentCore Browser pricing is present in the Stacktape source. Check AWS Bedrock AgentCore pricing for current browser-tool charges. If you configure recording, account for additional S3 storage costs in the target bucket.

### When should I use a browser instead of HTTP calls in my agent?

Use a browser when the agent needs a full browser environment rather than simple HTTP requests. If your agent only calls structured APIs (REST, GraphQL) with known endpoints, direct HTTP calls are faster, cheaper, and simpler. The browser is intended for use cases where a rendered browser context is needed; HTTP calls are for structured data exchange.

### Can I customize the underlying CloudFormation resources?

Yes. AgentCore Browser accepts `overrides`, the same escape hatch available on other Stacktape resources. Use [overrides](/configuration/overrides-and-escape-hatches) to modify properties on the generated CloudFormation child resources. Find resource logical IDs with [`stacktape info:stack --detailed`](/cli/info-stack) before applying overrides.

### Can multiple runtimes reference the same browser resource?

`AgentCoreRuntimeProps` includes `useBrowser?: string`, which accepts the name of an AgentCore Browser resource. The Stacktape type system does not restrict how many runtimes reference a given browser resource, but whether this works at the AWS Bedrock AgentCore service level is not documented in the Stacktape source. Consult the AWS Bedrock AgentCore documentation for any session-level or concurrency constraints before sharing a browser across runtimes.

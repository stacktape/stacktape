# AgentCore Browser

AgentCore Browser is a Stacktape resource for configuring a browser tool on AWS Bedrock AgentCore. An [AgentCore Runtime](/resources/ai/agentcore-runtime) can reference the browser by setting its `useBrowser` property to the browser resource name. An optional `recording` object lets you configure bucket-based browser recording with a target bucket and key prefix.

## When to use

Use AgentCore Browser when your [AgentCore Runtime](/resources/ai/agentcore-runtime) needs a browser tool reference. `AgentCoreRuntimeProps` exposes `useBrowser?: string`, which accepts the name of an AgentCore Browser resource. Attach a browser when the runtime needs browser-based capabilities beyond simple HTTP requests.

If your agent only needs to call HTTP APIs (REST, GraphQL), skip the browser and use direct HTTP calls or the [AgentCore Gateway](/resources/ai/agentcore-gateway) instead. A managed browser adds overhead that is unnecessary for structured API interactions.

## When NOT to use

AgentCore Browser is not the right fit when your AgentCore Runtime does not need a browser tool reference. If none of the runtime's tasks require a browser environment, skip this resource entirely — simpler alternatives are faster and easier to operate.

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

AgentCore Browser exposes an optional `recording` object with `enabled`, `bucketName`, and `prefix` properties. Omit the `recording` object when you do not need Stacktape to configure browser recording. Add it when you need recording settings such as a target bucket and key prefix.

The `recording` configuration may add S3 storage costs in the configured bucket. Manage retention policies and access control on that bucket separately.


> **Tip:** Add recording selectively when you need stored browser sessions for review. Confirm any audit or retention requirements in your own S3 bucket configuration.


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


`recording.bucketName` is a string, so the value can be a `$ResourceParam()` expression or a literal bucket name. In this example, `$ResourceParam("recordingsBucket", "name")` dynamically resolves to the name of the Stacktape-managed `recordingsBucket` resource. If the bucket is not managed in the same Stacktape stack, make sure the AWS-side permissions and bucket policy allow AgentCore Browser recording. See [directives](/configuration/directives) for more on `$ResourceParam`.

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
    environment: { AI_MODEL: 'eu.amazon.nova-micro-v1:0' }
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


`AgentCoreRuntimeProps` exposes `useMemory`, `useGateway`, `useBrowser`, and `useCodeInterpreter` as optional string properties for referencing the corresponding AgentCore resources by name. In this example, `useMemory: 'researchMemory'` and `useBrowser: 'researchBrowser'` match the keys in the returned `resources` object. The `expirationDays` property on `AgentCoreMemory` controls how long memory entries are retained. The `lifecycle` object on `AgentCoreRuntime` tunes session lifetime: `idleRuntimeSessionTimeout` sets how long an idle session persists, and `maxLifetime` caps the total session duration. The values `45`, `3600`, and `28800` in this example are illustrative choices — the source types expose these as `number` properties without documenting specific defaults or upper bounds. Adjust them to fit your agent's session and retention requirements.

## Overrides

AgentCore Browser accepts the standard [overrides](/configuration/overrides-and-escape-hatches) escape hatch for modifying generated CloudFormation child resources. Use dot-notation paths to override specific properties. Find resource logical IDs with [`stacktape stack-info --detailed`](/cli/info-stack).

## Tags

AgentCore Browser accepts `tags?: CloudformationTag[]`. Use tags where your AWS tagging policy expects them. See the [API reference](#api-reference) below for the exact shape.

## Referenceable parameters

Use [`$ResourceParam()`](/configuration/directives) to reference browser resource values in other parts of your configuration. AgentCore Browser exposes the following parameters:

| Parameter | Description |
|---|---|
| `id` | The ID of the AgentCore Browser resource. |
| `arn` | The ARN of the AgentCore Browser resource. |

## API Reference


### Definition: `AgentCoreBrowserProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/agentcore` with definition name `AgentCoreBrowserProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `description` | no | `string` | - |
| `recording` | no | `unknown` | - |
| `tags` | no | `Array<CloudformationTag>` | - |


## FAQ

### How do I connect the browser to my agent runtime?

Set the `useBrowser` property on your [AgentCore Runtime](/resources/ai/agentcore-runtime) to the resource name of your AgentCore Browser. `AgentCoreRuntimeProps` includes `useBrowser?: string`; in your Stacktape config, pass the browser resource name you return from `resources`. For example, if your browser resource is keyed as `researchBrowser`, set `useBrowser: 'researchBrowser'` on the runtime.

### Where are session recordings stored?

The `recording` object on `AgentCoreBrowserProps` accepts `enabled`, `bucketName`, and `prefix`. Use `bucketName` to pass the target bucket name and `prefix` to set the key prefix for recordings. You are responsible for managing the bucket's lifecycle policies and access control. Use [`$ResourceParam()`](/configuration/directives) to reference a Stacktape-managed [Bucket](/resources/storage/s3-bucket) by name, or pass a hardcoded name for an externally managed bucket.

### AgentCore Browser vs AgentCore Code Interpreter — which do I need?

Use AgentCore Browser when the agent needs to interact with rendered web pages; use [AgentCore Code Interpreter](/resources/ai/agentcore-code-interpreter) when the agent needs to compute, transform data, or run scripts. `AgentCoreRuntimeProps` exposes both `useBrowser` and `useCodeInterpreter` as string properties, so a single runtime can reference one of each at the same time.

### How much does AgentCore Browser cost?

No concrete AgentCore Browser pricing is present in the Stacktape source. Check AWS Bedrock AgentCore pricing for current browser-tool charges. If you configure recording, account for additional S3 storage costs in the target bucket.

### When should I use a browser instead of HTTP calls in my agent?

Use a browser when the agent needs a full browser environment rather than simple HTTP requests. If your agent only calls structured APIs (REST, GraphQL) with known endpoints, direct HTTP calls are faster, cheaper, and simpler. The browser is intended for use cases where a rendered browser context is needed; HTTP calls are for structured data exchange.

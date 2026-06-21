# AgentCore Runtime

AgentCore Runtime deploys a container-packaged AI agent on AWS Bedrock AgentCore. You supply your agent code as a container image, choose a communication protocol (HTTP, MCP, A2A, or AGUI), and Stacktape provisions the managed runtime — with optional connections to [persistent memory](/resources/ai/agentcore-memory), a [tool gateway](/resources/ai/agentcore-gateway), a [browser sandbox](/resources/ai/agentcore-browser), and a [code interpreter](/resources/ai/agentcore-code-interpreter).

## When to use

Use AgentCore Runtime when you're building an AI agent that needs managed infrastructure on AWS. You configure protocol, endpoints, lifecycle, and tool attachments declaratively — Stacktape provisions the runtime and wires everything together.

Good fits:

- **Multi-turn AI agents** that maintain state across requests and need session-level lifecycle control (idle timeouts, max lifetime).
- **Tool-using agents** that need access to a managed browser, code interpreter, or persistent memory without provisioning those services yourself.
- **MCP or A2A agents** where you want first-class protocol support rather than building your own protocol handling on top of HTTP.
- **Teams standardizing on Bedrock** who want their agent infrastructure managed alongside other Stacktape resources in a single stack.

## When NOT to use

- **Simple LLM API wrappers** — if your service calls a model API and returns the response, a [Lambda function](/resources/compute/lambda-function) or [web service](/resources/compute/web-service) is simpler and cheaper.
- **Non-AI container workloads** — use a [web service](/resources/compute/web-service), [private service](/resources/compute/private-service), or [multi-container workload](/resources/compute/multi-container-workload) instead. AgentCore Runtime provides protocol selection and tool-attachment properties that are unnecessary for general-purpose services.
- **Latency-sensitive edge inference** — consider an [edge function](/resources/compute/edge-function) with a lightweight model or API call instead.

## Basic example

A minimal AgentCore Runtime using the HTTP protocol:


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreRuntime, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    endpoints: ['chat']
  });

  return {
    resources: { myAgent }
  };
});
```


This deploys a container running your agent code on Bedrock AgentCore. The config declares a `chat` endpoint for the runtime. This example uses `CustomDockerfilePackaging` with `buildContextPath: './agent'`, so Stacktape uses the [Dockerfile-based container packaging](/packaging/containers/custom-dockerfile) mode for the runtime.

## Examples

### Agent with persistent memory and lifecycle

An agent that uses [AgentCore Memory](/resources/ai/agentcore-memory) for cross-session context and sets session lifecycle limits. The `useMemory` value must match the resource name in the returned `resources` object — in this case `agentMemory`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreRuntime,
  AgentCoreMemory,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const agentMemory = new AgentCoreMemory({
    expirationDays: 30
  });

  const supportAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    useMemory: 'agentMemory',
    endpoints: ['chat'],
    lifecycle: {
      maxLifetime: 7200,
      idleRuntimeSessionTimeout: 300
    }
  });

  return {
    resources: { agentMemory, supportAgent }
  };
});
```


In this example, `idleRuntimeSessionTimeout` is set to `300` and `maxLifetime` to `7200`. The `expirationDays` on the memory resource controls how long stored entries are retained (in days).

### Agent with tools, authentication, and resource access

A more complete agent that attaches a gateway (no tools configured in this example — see [AgentCore Gateway](/resources/ai/agentcore-gateway)), browser, and code interpreter, protects its endpoint with JWT authentication, and accesses a DynamoDB table via `connectTo`:


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreRuntime,
  AgentCoreMemory,
  AgentCoreGateway,
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  DynamoDbTable,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const agentMemory = new AgentCoreMemory({
    expirationDays: 60
  });

  const toolGateway = new AgentCoreGateway({
    description: 'Gateway for support operations',
    supportedVersions: ['2025-03-26']
  });

  const browser = new AgentCoreBrowser({
    description: 'Sandboxed browser for web research'
  });

  const codeRunner = new AgentCoreCodeInterpreter({
    description: 'Sandboxed code execution'
  });

  const conversations = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'sessionId', type: 'string' }
    }
  });

  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    protocol: 'HTTP',
    useMemory: 'agentMemory',
    useGateway: 'toolGateway',
    useBrowser: 'browser',
    useCodeInterpreter: 'codeRunner',
    endpoints: [
      {
        name: 'production',
        description: 'Main agent endpoint'
      }
    ],
    lifecycle: {
      maxLifetime: 14400,
      idleRuntimeSessionTimeout: 1800
    },
    connectTo: ['conversations'],
    authorizer: {
      discoveryUrl:
        'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123/.well-known/openid-configuration',
      allowedAudience: ['my-app-client-id']
    },
    environment: [{ name: 'AI_MODEL', value: 'anthropic.claude-sonnet-4-20250514' }]
  });

  return {
    resources: {
      agentMemory,
      toolGateway,
      browser,
      codeRunner,
      conversations,
      myAgent
    }
  };
});
```


In this example, `idleRuntimeSessionTimeout` is set to `1800` and `maxLifetime` to `14400`. The `connectTo` grants access to the DynamoDB table and provides connection values including `STP_CONVERSATIONS_NAME`, `STP_CONVERSATIONS_ARN`, and `STP_CONVERSATIONS_STREAM_ARN`. The `supportedVersions` property on the gateway is an optional string array that declares which gateway protocol versions this agent supports — see [AgentCore Gateway](/resources/ai/agentcore-gateway) for details. The `authorizer` property configures JWT authorizer settings: `discoveryUrl` (required) points to an OIDC discovery endpoint, while `allowedAudience`, `allowedClients`, and `allowedScopes` are optional string arrays that filter incoming tokens.

## Protocols

AgentCore Runtime supports four communication protocols, set via the `protocol` property:

| Protocol | Description |
|----------|-------------|
| `HTTP` | Standard HTTP request/response. Works with any HTTP client or framework. |
| `MCP` | [Model Context Protocol](https://modelcontextprotocol.io/). Standardized protocol for tool-calling agents that follow the MCP specification. |
| `A2A` | Agent-to-Agent protocol. For agents that communicate with other agents using a structured agent protocol. |
| `AGUI` | Agent GUI protocol. For agents that render interactive UI elements as part of their responses. |

Use `HTTP` for a conventional request/response endpoint. Use `MCP`, `A2A`, or `AGUI` only when your agent implements that specific protocol. All four values are valid for the `protocol` property: `'HTTP'`, `'MCP'`, `'A2A'`, and `'AGUI'`.

## Endpoints

Define the API endpoints your agent runtime exposes with the `endpoints` property. Each endpoint can be a simple string (the endpoint name) or an object with additional configuration.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreRuntime, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    endpoints: [
      'chat',
      {
        name: 'analyze',
        description: 'Analyze documents and return structured data'
      }
    ]
  });

  return {
    resources: { myAgent }
  };
});
```


When using the object form, you can set:
- **`name`** — The endpoint identifier (required).
- **`description`** — Human-readable description of what the endpoint does.
- **`runtimeVersion`** — Pin a specific runtime version for this endpoint.

Use named endpoints when your agent exposes multiple capabilities (e.g., a `chat` endpoint for conversations and an `analyze` endpoint for document processing). Use the object form when you need to attach metadata or pin a runtime version.

## Tool integrations

AgentCore Runtime can connect to managed tools that extend your agent's capabilities. Each tool is a separate Stacktape resource that you reference by name:

| Property | Resource type | What it provides |
|----------|--------------|------------------|
| `useMemory` | [AgentCore Memory](/resources/ai/agentcore-memory) | Persistent, cross-session memory store |
| `useGateway` | [AgentCore Gateway](/resources/ai/agentcore-gateway) | MCP-style tool gateway with governed tool definitions |
| `useBrowser` | [AgentCore Browser](/resources/ai/agentcore-browser) | Sandboxed browser for web research |
| `useCodeInterpreter` | [AgentCore Code Interpreter](/resources/ai/agentcore-code-interpreter) | Sandboxed code execution environment |

You can attach all four simultaneously. Each property is a string that references a same-stack AgentCore resource by name. The value must match the resource name in the returned `resources` object.

- **`useMemory`** — attach when your agent needs retained context across sessions (conversation history, user preferences). Skip for stateless, single-turn request/response agents.
- **`useGateway`** — attach when tool definitions need to be managed and governed separately from the agent code. Skip when your agent handles tool calls internally.
- **`useBrowser`** — attach only when the agent needs to browse external web pages. Adds a managed browser sandbox, which increases the resource footprint.
- **`useCodeInterpreter`** — attach only when the agent needs to execute user-provided or generated code. Adds a sandboxed execution environment.

To access resource attributes from other parts of your config, use the [`$ResourceParam` directive](/configuration/directives).


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreRuntime,
  AgentCoreGateway,
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const toolGateway = new AgentCoreGateway({
    description: 'MCP tool gateway for support tools',
    supportedVersions: ['2025-03-26']
  });

  const browser = new AgentCoreBrowser({
    description: 'Sandboxed browser for web research'
  });

  const codeRunner = new AgentCoreCodeInterpreter({
    description: 'Sandboxed code execution'
  });

  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    useGateway: 'toolGateway',
    useBrowser: 'browser',
    useCodeInterpreter: 'codeRunner',
    endpoints: ['chat']
  });

  return {
    resources: { toolGateway, browser, codeRunner, myAgent }
  };
});
```


In the example above, `supportedVersions: ['2025-03-26']` on the gateway is an optional string array. No `tools` are configured on the gateway in this example — see [AgentCore Gateway](/resources/ai/agentcore-gateway) for defining tool entries (each requires a `toolSchema`). See also [AgentCore Browser](/resources/ai/agentcore-browser), [AgentCore Code Interpreter](/resources/ai/agentcore-code-interpreter), and [AgentCore Memory](/resources/ai/agentcore-memory).

## Lifecycle

Control how long agent runtime sessions live with the `lifecycle` property. Use these settings to manage session duration and control costs.

- **`maxLifetime`** — Maximum lifetime of the runtime session. After this duration, the session is terminated regardless of activity.
- **`idleRuntimeSessionTimeout`** — How long an idle session stays alive before being reclaimed.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreRuntime, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    endpoints: ['chat'],
    lifecycle: {
      maxLifetime: 3600,
      idleRuntimeSessionTimeout: 300
    }
  });

  return {
    resources: { myAgent }
  };
});
```


In this example, `idleRuntimeSessionTimeout` is set to `300` and `maxLifetime` to `3600`. Both properties accept a numeric value. For cost-sensitive workloads, consider setting a shorter `idleRuntimeSessionTimeout` to reclaim idle sessions sooner. Use a longer `maxLifetime` for agents that maintain important in-memory state across a multi-step conversation.

## Authentication

Protect your agent endpoints with JWT-based authorization using the `authorizer` property. The `discoveryUrl` is required and points to your identity provider's OpenID Connect discovery document. You can optionally restrict access by audience, client ID, or scope.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreRuntime, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    endpoints: ['chat'],
    authorizer: {
      discoveryUrl:
        'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123/.well-known/openid-configuration',
      allowedAudience: ['my-app-client-id'],
      allowedClients: ['trusted-client'],
      allowedScopes: ['agent:invoke']
    }
  });

  return {
    resources: { myAgent }
  };
});
```


| Property | Purpose |
|----------|---------|
| `discoveryUrl` | OIDC discovery endpoint URL (required) |
| `allowedAudience` | Valid `aud` claim values |
| `allowedClients` | Valid client IDs in the token |
| `allowedScopes` | Required scopes the token must contain |

Configure an authorizer for any agent endpoint exposed to the public internet. You may skip it temporarily for private prototypes or agents protected by another trusted entry point (e.g., behind an internal API gateway). JWT auth requires an OIDC provider (such as Amazon Cognito or Auth0) and token management by the caller. The `discoveryUrl` is the only required field — `allowedAudience`, `allowedClients`, and `allowedScopes` are optional string array filters you can layer on top to further restrict which tokens are accepted.

## Connecting to other resources

AgentCore Runtime accepts `connectTo` through `ResourceAccessProps`. For supported target resource types, `connectTo` grants IAM permissions and provides `STP_[RESOURCE_NAME]_[PARAM]` connection values as documented in [Connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreRuntime,
  DynamoDbTable,
  Bucket,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const knowledgeBase = new Bucket({});

  const conversationLog = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'sessionId', type: 'string' }
    }
  });

  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    endpoints: ['chat'],
    connectTo: ['knowledgeBase', 'conversationLog']
  });

  return {
    resources: { knowledgeBase, conversationLog, myAgent }
  };
});
```


In this example, the agent gets read/write access to the S3 bucket and DynamoDB table. The `connectTo` property provides connection values following the `STP_[RESOURCE_NAME]_[PARAM]` pattern — for example, `STP_KNOWLEDGE_BASE_NAME` and `STP_CONVERSATION_LOG_NAME`. See [Connecting resources](/configuration/connecting-resources) for the full reference by resource type.

For AWS services not covered by `connectTo`, use `iamRoleStatements` to add raw IAM policy statements:


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreRuntime, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    endpoints: ['chat'],
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['bedrock:InvokeModel'],
        Resource: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-*']
      }
    ]
  });

  return {
    resources: { myAgent }
  };
});
```


This example grants permission to invoke any Anthropic Claude foundation model via the Bedrock API. Adjust the `Action` and `Resource` values to match the AWS services your agent needs.

## Packaging

AgentCore Runtime uses [container packaging](/packaging/overview) — the same modes available to other container workloads. Five packaging modes are supported:

| Mode | Class | When to use |
|------|-------|-------------|
| [Stacktape buildpack](/packaging/containers/stacktape-buildpack) | `StacktapeImageBuildpackPackaging` | Zero-config from source code. Best for JS/TS/Python agents. |
| [Custom Dockerfile](/packaging/containers/custom-dockerfile) | `CustomDockerfilePackaging` | Full control over the container environment. Use when you need specific system dependencies or a custom base image. |
| [Prebuilt image](/packaging/containers/prebuilt-image) | `PrebuiltImagePackaging` | Reference an existing image from any registry. Skips the build step. |
| [Nixpacks](/packaging/containers/nixpacks) | `NixpacksPackaging` | Auto-detected build from source. Alternative zero-config option. |
| [External buildpack](/packaging/containers/external-buildpack) | `ExternalBuildpackPackaging` | Cloud Native Buildpacks (buildpacks.io). |

Most teams use `CustomDockerfilePackaging` for full control or `StacktapeImageBuildpackPackaging` for zero-config builds. With `PrebuiltImagePackaging`, provide a reference to an existing public image or a private image with `repositoryCredentialsSecretArn` when credentials are needed. This page shows `CustomDockerfilePackaging` because agent containers commonly need runtime-specific dependencies — see [container packaging](/packaging/overview) for details and examples of all five modes.

## Environment variables

Pass configuration to your agent container with the `environment` property. Use the [`$Secret` directive](/configuration/directives) for sensitive values.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreRuntime, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    endpoints: ['chat'],
    environment: [
      { name: 'AI_MODEL', value: 'anthropic.claude-sonnet-4-20250514' },
      { name: 'MAX_TOKENS', value: '4096' },
      { name: 'API_KEY', value: "$Secret('my-api-key')" }
    ]
  });

  return {
    resources: { myAgent }
  };
});
```


Each entry needs a `name` and a `value`. Values are strings, numbers, or booleans (numbers and booleans are converted to strings). Environment variables from `connectTo` follow the `STP_[RESOURCE_NAME]_[PARAM]` pattern and are merged automatically — you don't need to declare them in `environment`. See [Connecting resources](/configuration/connecting-resources) for the full reference.

## Request headers

The `requestHeaders` property accepts an array of header name strings for the AgentCore Runtime:


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreRuntime, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(() => {
  const myAgent = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'HTTP',
    endpoints: ['chat'],
    requestHeaders: ['X-Tenant-Id', 'X-Trace-Id']
  });

  return {
    resources: { myAgent }
  };
});
```


The `requestHeaders` property is an optional string array for header names. The provided type source does not document additional forwarding or filtering semantics beyond declaring the header names.

## FAQ

### What is AWS Bedrock AgentCore?

AWS Bedrock AgentCore is a managed service for running AI agents. You bring your agent logic as a container image; AgentCore provides the runtime infrastructure. Stacktape's `AgentCoreRuntime` resource provisions and configures AgentCore agents declaratively as part of your stack, with properties for protocol selection, lifecycle control, endpoints, and tool attachments.

### What protocols does AgentCore Runtime support?

AgentCore Runtime supports four protocols: `HTTP` (standard request/response), `MCP` (Model Context Protocol for tool-calling agents), `A2A` (Agent-to-Agent communication), and `AGUI` (Agent GUI for interactive UIs). Set the protocol via the `protocol` property. Choose `MCP` or `A2A` when your agent specifically implements those protocol specifications; use `HTTP` for general-purpose agent endpoints.

### Can I attach persistent memory to my agent?

Yes. Create an [AgentCore Memory](/resources/ai/agentcore-memory) resource and reference it with `useMemory`. The memory store persists across sessions. Set `expirationDays` on the memory resource to control how long stored entries are retained. See the [AgentCore Memory](/resources/ai/agentcore-memory) page for full configuration options.

### How do I access other AWS resources from my agent?

Use `connectTo` to grant your agent access to Stacktape resources like DynamoDB tables, S3 buckets, SQS queues, and databases. For supported target resource types, `connectTo` grants IAM permissions and provides `STP_[RESOURCE_NAME]_[PARAM]` connection values as documented in [Connecting resources](/configuration/connecting-resources). For AWS services outside Stacktape's resource model, use `iamRoleStatements` to add custom IAM permissions.

### What container images can I use?

AgentCore Runtime supports five [container packaging](/packaging/overview) modes: Stacktape buildpack (zero-config from source), custom Dockerfile, prebuilt image, Nixpacks, and external buildpack. With `PrebuiltImagePackaging`, you provide an image reference (public or private with `repositoryCredentialsSecretArn`). Your image needs to satisfy the runtime contract expected by AWS Bedrock AgentCore.

### When should I use AgentCore Runtime vs a Lambda function for AI?

Use AgentCore Runtime when your agent needs lifecycle control (`maxLifetime`, `idleRuntimeSessionTimeout`), multi-turn conversations, or tool attachments (`useMemory`, `useBrowser`, `useCodeInterpreter`, `useGateway`). Use a [Lambda function](/resources/compute/lambda-function) when you're building a stateless AI endpoint — a single model call that returns a response. Lambda is simpler and cheaper for request/response workloads; AgentCore Runtime is purpose-built for agents with longer-running sessions and tool integrations.

### When should I use AgentCore Runtime vs a web service?

A [web service](/resources/compute/web-service) gives you an always-on container with full control over networking, scaling, health checks, and deployment strategies. AgentCore Runtime is more opinionated — it provides protocol selection, lifecycle control, and tool-attachment properties declaratively. Choose a web service if you need fine-grained control over container resources, custom load balancing, or if your agent is part of a larger application. Choose AgentCore Runtime when you want managed agent infrastructure with less operational overhead.

### How do I secure my agent endpoints?

Use the `authorizer` property to configure JWT-based authentication. Provide your OIDC provider's `discoveryUrl`, and optionally restrict access by audience (`allowedAudience`), client ID (`allowedClients`), or scope (`allowedScopes`). As a security best practice, configure an authorizer for production agents.

### Can I use multiple tools with a single agent?

Yes. You can attach all four tool types simultaneously — `useMemory`, `useGateway`, `useBrowser`, and `useCodeInterpreter` — each referencing a separate AgentCore resource in your stack by name.

### What referenceable parameters does AgentCore Runtime expose?

AgentCore Runtime exposes four [referenceable parameters](/configuration/referenceable-parameters): `id` (the runtime resource ID), `arn` (the runtime ARN), `endpointName` (the deployed endpoint name), and `endpointArn` (the endpoint ARN). Use these with the [`$ResourceParam` directive](/configuration/directives) to reference runtime attributes in other resource configurations, environment variables, or stack outputs.

### How is AWS Bedrock AgentCore priced?

Bedrock AgentCore pricing is session-based — you pay for active runtime sessions rather than reserved compute capacity. Pricing varies by region and session duration. Check the [AWS Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/) for current rates, as pricing details are not embedded in the Stacktape configuration.

### What AWS regions support AgentCore Runtime?

AWS Bedrock AgentCore is available in a subset of AWS regions. Regional availability may differ from other Bedrock features. Check the [AWS regional services list](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) for current AgentCore availability before choosing your deployment region in Stacktape.

### How does AgentCore Runtime handle concurrency?

AgentCore Runtime concurrency and scaling are managed by AWS Bedrock AgentCore, not configured directly in Stacktape. You control per-session behavior through the `lifecycle` property (`idleRuntimeSessionTimeout`, `maxLifetime`) but do not set instance counts or autoscaling policies on the runtime resource itself. For detailed concurrency limits and quotas, check the AWS Bedrock AgentCore documentation.

## API Reference


## API Reference: `AgentCoreRuntimeProps`
```typescript
import type { AgentCoreJwtAuthorizerConfig, AgentCoreRuntimeEndpointConfig, AgentCoreRuntimeLifecycleConfig, CloudformationTag, CustomDockerfileCwImagePackaging, EnvironmentVar, ExternalBuildpackCwImagePackaging, NixpacksCwImagePackaging, PrebuiltCwImagePackaging, StpBuildpackCwImagePackaging, StpIamRoleStatement } from 'stacktape';

type AgentCoreRuntimeProps = {
  packaging: AgentCoreRuntimePackaging;
  authorizer?: AgentCoreJwtAuthorizerConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  description?: string;
  endpoints?: Array<AgentCoreRuntimeEndpoints>;
  environment?: Array<EnvironmentVar>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  lifecycle?: AgentCoreRuntimeLifecycleConfig;
  protocol?: "A2A" | "AGUI" | "HTTP" | "MCP";
  requestHeaders?: Array<string>;
  tags?: Array<CloudformationTag>;
  useBrowser?: string;
  useCodeInterpreter?: string;
  useGateway?: string;
  useMemory?: string;
};

/** Union choices used by the properties above. */
type AgentCoreRuntimePackaging =
  | StpBuildpackCwImagePackaging
  | ExternalBuildpackCwImagePackaging
  | PrebuiltCwImagePackaging
  | CustomDockerfileCwImagePackaging
  | NixpacksCwImagePackaging;

type AgentCoreRuntimeEndpoints =
  | AgentCoreRuntimeEndpointConfig
  | "option-2";
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `packaging` | yes | `stacktape-image-buildpack \| external-buildpack \| prebuilt-image \| custom-dockerfile \| nixpacks` | - | - |
| `authorizer` | no | `AgentCoreJwtAuthorizerConfig` | - | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `description` | no | `string` | - | - |
| `endpoints` | no | `Array<AgentCoreRuntimeEndpoint \| option-2>` | - | - |
| `environment` | no | `Array<EnvironmentVar>` | - | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `lifecycle` | no | `AgentCoreRuntimeLifecycleConfig` | - | - |
| `protocol` | no | `string: "A2A" \| "AGUI" \| "HTTP" \| "MCP"` | - | - |
| `requestHeaders` | no | `Array<string>` | - | - |
| `tags` | no | `Array<CloudformationTag>` | - | - |
| `useBrowser` | no | `string` | - | - |
| `useCodeInterpreter` | no | `string` | - | - |
| `useGateway` | no | `string` | - | - |
| `useMemory` | no | `string` | - | - |


## Referenceable parameters

AgentCore Runtime exposes the following parameters, accessible via the [`$ResourceParam` directive](/configuration/directives):

| Parameter | Description |
|-----------|-------------|
| `id` | The runtime resource ID |
| `arn` | The runtime ARN |
| `endpointName` | The deployed endpoint name |
| `endpointArn` | The endpoint ARN |

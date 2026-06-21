# AgentCore Gateway

A Stacktape AgentCore Gateway is a managed MCP tool gateway on AWS Bedrock AgentCore. It registers Lambda-backed tools behind a single endpoint that [AgentCore runtimes](/resources/ai/agentcore-runtime) can discover and invoke. Configure optional JWT authentication to restrict access. Stacktape provisions the gateway resources in your AWS account.

## When to use

Use an AgentCore Gateway when your AI agent needs to call external tools — database lookups, API calls, internal business logic — through a centralized, schema-defined interface. The gateway acts as a tool registry: each tool declares its input/output schema and maps to a [Lambda function](/resources/compute/lambda-function) that handles the execution.

Common scenarios:

- **Multi-tool agents** that need a single, discoverable endpoint for all their tools instead of hard-coding Lambda ARNs.
- **Secure tool access** where you need JWT-based authorization so only authenticated agents or users can invoke tools.
- **Team-maintained toolkits** where tools are defined centrally and shared across multiple agent runtimes.

## When NOT to use

- **Direct Lambda invocation** — If your agent only calls one or two Lambda functions and doesn't need schema-based tool discovery, invoke them directly from your runtime code using the standard Stacktape [resource access model](/configuration/connecting-resources). The gateway adds a layer of indirection that's only worth it when you have multiple tools or need the MCP discovery protocol.
- **Non-Lambda backends** — Gateway tools must be backed by Lambda functions. If your tool logic runs in a container service or external API, you'll need a Lambda wrapper or a different approach.
- **General-purpose API gateway** — For HTTP APIs serving web or mobile clients, use an [HTTP API Gateway](/resources/networking/http-api-gateway) or [Application Load Balancer](/resources/networking/application-load-balancer) instead.

## Basic example

This example creates a gateway with one tool that looks up customer orders. The tool is backed by a Lambda function defined in the same stack.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreGateway,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const orderLookupFn = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/order-lookup.ts'
    }),
    memory: 512,
    timeout: 30
  });

  const toolGateway = new AgentCoreGateway({
    description: 'Tool gateway for customer support agent',
    tools: [
      {
        name: 'orderLookup',
        description: 'Look up customer orders by ID',
        function: 'orderLookupFn',
        toolSchema: [
          {
            name: 'lookupOrder',
            description: 'Find an order by order ID',
            inputSchema: {
              type: 'object',
              properties: {
                orderId: { type: 'string', description: 'The order ID to look up' }
              },
              required: ['orderId']
            }
          }
        ]
      }
    ]
  });

  return {
    resources: { orderLookupFn, toolGateway }
  };
});
```


The `function` property references the Lambda function by its Stacktape resource name (the key used in the `resources` object).

## Examples

### Multi-tool gateway with JWT authorization

A realistic e-commerce agent gateway with two tools — order management and inventory checks — protected by a JWT authorizer. Each tool references a separate Lambda function.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreGateway,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const orderFn = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/orders.ts' }),
    memory: 512,
    timeout: 30
  });

  const inventoryFn = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/inventory.ts' }),
    memory: 256,
    timeout: 15
  });

  const toolGateway = new AgentCoreGateway({
    description: 'E-commerce agent tools',
    authorizer: {
      discoveryUrl:
        'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123/.well-known/openid-configuration',
      allowedAudience: ['my-app-client-id']
    },
    tools: [
      {
        name: 'orders',
        description: 'Order management operations',
        function: 'orderFn',
        toolSchema: [
          {
            name: 'getOrder',
            description: 'Retrieve order details by ID',
            inputSchema: {
              type: 'object',
              properties: {
                orderId: { type: 'string', description: 'Order identifier' }
              },
              required: ['orderId']
            },
            outputSchema: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                items: { type: 'array', items: { type: 'object' } }
              }
            }
          },
          {
            name: 'cancelOrder',
            description: 'Cancel a pending order',
            inputSchema: {
              type: 'object',
              properties: {
                orderId: { type: 'string' },
                reason: { type: 'string' }
              },
              required: ['orderId']
            }
          }
        ]
      },
      {
        name: 'inventory',
        description: 'Check product stock levels',
        function: 'inventoryFn',
        toolSchema: [
          {
            name: 'checkStock',
            inputSchema: {
              type: 'object',
              properties: {
                productId: { type: 'string' }
              },
              required: ['productId']
            }
          }
        ]
      }
    ]
  });

  return {
    resources: { orderFn, inventoryFn, toolGateway }
  };
});
```


A single tool can expose multiple operations via its `toolSchema` — for example, the `orders` tool above exposes both `getOrder` and `cancelOrder`, both backed by the same Lambda function.

### Full stack: gateway with AgentCore runtime

A complete customer support agent setup with a gateway, backing Lambda functions, and an AgentCore runtime that consumes the gateway. `AgentCoreRuntimeProps` includes a `useGateway` string property that links the runtime to a gateway. The gateway exposes a `url` referenceable parameter — use `$ResourceParam('supportGateway', 'url')` when your runtime code needs the gateway endpoint explicitly.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreGateway,
  AgentCoreRuntime,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const getCustomerProfile = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/get-customer-profile.ts'
    }),
    memory: 512,
    timeout: 30
  });

  const createSupportTicket = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/create-support-ticket.ts'
    }),
    memory: 512,
    timeout: 30
  });

  const supportGateway = new AgentCoreGateway({
    description: 'Governed tool gateway for customer support operations',
    instructions: 'Use these tools only for customer support lookup and ticket workflows.',
    tools: [
      {
        name: 'customerProfile',
        description: "Looks up a customer's support tier and account status",
        function: 'getCustomerProfile',
        toolSchema: [
          {
            name: 'get_customer_profile',
            description: 'Get customer status, plan, support tier, and recent cases',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string', description: 'Customer account identifier' }
              },
              required: ['customerId']
            }
          }
        ]
      },
      {
        name: 'supportTicket',
        description: 'Creates a support ticket for follow-up',
        function: 'createSupportTicket',
        toolSchema: [
          {
            name: 'create_support_ticket',
            description: 'Create a customer support ticket with priority and summary',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string' },
                priority: { type: 'string' },
                summary: { type: 'string' }
              },
              required: ['customerId', 'priority', 'summary']
            }
          }
        ]
      }
    ]
  });

  const supportAgent = new AgentCoreRuntime({
    description: 'Customer support agent with governed business tools',
    packaging: new CustomDockerfilePackaging({ buildContextPath: './agent' }),
    useGateway: 'supportGateway',
    environment: [
      { name: 'AI_MODEL', value: 'eu.amazon.nova-micro-v1:0' },
      { name: 'AGENT_NAME', value: 'customer-support' }
    ]
  });

  return {
    resources: { getCustomerProfile, createSupportTicket, supportGateway, supportAgent }
  };
});
```


Inside the runtime container, use the gateway URL to interact with the registered tools. Reference the URL explicitly with `$ResourceParam('supportGateway', 'url')` in an `environment` entry to pass it as a named environment variable to your runtime code.

## Tools

Each tool in the gateway maps to a Lambda function and declares one or more operations via `toolSchema`. Each `AgentCoreGatewayTool` defines a `name`, optional `description`, a Lambda reference through `function` or `lambdaArn`, and a required `toolSchema` array describing available operations. Provide exactly one of `function` or `lambdaArn` per tool — providing both is not supported.

### Referencing Lambda functions

There are two ways to point a tool at its backing Lambda — provide exactly one per tool:

- **`function`** — Reference a Lambda function defined in the same Stacktape stack by its resource name (the key in the `resources` object).
- **`lambdaArn`** — Provide the full ARN of any Lambda function. Use this for Lambda functions in other stacks or AWS accounts.

### Tool schema

Every tool has a `toolSchema` array. Each entry describes an operation:

| Property | Required | Description |
|---|---|---|
| `name` | Yes | Operation name (e.g. `lookupOrder`, `createTicket`) |
| `description` | No | Human-readable description of what the operation does |
| `inputSchema` | Yes | JSON Schema object describing the expected input |
| `outputSchema` | No | JSON Schema object describing the response shape |

Tool schemas are passed through to the AgentCore API. Both `inputSchema` and `outputSchema` accept any JSON Schema object. Consult the AWS Bedrock AgentCore documentation for the exact JSON Schema keywords supported at the API level. In practice, keeping schemas simple (`type`, `properties`, `required`, `items`, `description`) ensures broad compatibility.

## JWT authorization

The gateway accepts a JWT authorizer configuration with an OIDC discovery URL and optional audience, client, and scope allow-lists. OIDC discovery URLs are the expected shape — verify provider-specific compatibility with AWS Bedrock AgentCore.

The `authorizer` property is optional. For production deployments, configure an authorizer to restrict access to authenticated callers.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreGateway } from 'stacktape';
export default defineConfig(() => {
  const toolGateway = new AgentCoreGateway({
    description: 'Secured tool gateway',
    authorizer: {
      discoveryUrl:
        'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123/.well-known/openid-configuration',
      allowedAudience: ['my-app-client-id'],
      allowedClients: ['agent-client-id'],
      allowedScopes: ['tools:read', 'tools:execute']
    },
    tools: []
  });

  return {
    resources: { toolGateway }
  };
});
```


The `discoveryUrl` is required — it must point to the `.well-known/openid-configuration` endpoint of your identity provider. `allowedAudience`, `allowedClients`, and `allowedScopes` configure optional allow-lists for the JWT authorizer.


> **Tip:** If you're using a [Stacktape user auth pool](/resources/security/user-auth-pool) (Amazon Cognito), construct the discovery URL from your User Pool ID: `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/openid-configuration`.


## Connecting to an AgentCore runtime

The gateway is designed to be consumed by an [AgentCore runtime](/resources/ai/agentcore-runtime). `AgentCoreRuntimeProps` includes a `useGateway` string property that accepts the gateway's resource name. The gateway exposes a `url` referenceable parameter — use `$ResourceParam('toolGateway', 'url')` in an `environment` entry to pass the endpoint to your runtime container.


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreGateway,
  AgentCoreRuntime,
  CustomDockerfilePackaging
} from 'stacktape';
export default defineConfig(() => {
  const toolGateway = new AgentCoreGateway({
    description: 'Agent tools',
    tools: []
  });

  const agentRuntime = new AgentCoreRuntime({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './agent'
    }),
    protocol: 'MCP',
    useGateway: 'toolGateway'
  });

  return {
    resources: { toolGateway, agentRuntime }
  };
});
```


Inside the runtime container, read the environment variable you configured (e.g. `GATEWAY_URL`) to get the gateway endpoint. Use `$ResourceParam('toolGateway', 'url')` in an `environment` entry on the runtime to pass the URL explicitly.

## MCP protocol configuration

AgentCore Gateway exposes MCP-related configuration through three optional properties. Unlike [AgentCore runtime](/resources/ai/agentcore-runtime), the gateway does not expose a configurable `protocol` property.

- **`instructions`** — Natural-language instructions describing the gateway's purpose and how agents should use its tools. Returned during MCP discovery. Useful when you want to guide agent behavior — for example, telling the agent to prefer one tool over another for certain query types.
- **`supportedVersions`** — List of MCP protocol version strings the gateway accepts.
- **`searchType`** — Controls how the gateway matches tool search queries from agents.

Most deployments can leave these unset. The `instructions` property is the most commonly used of the three — it provides context to the agent at discovery time without modifying tool schemas.

## Debugging

Set `exceptionLevel` to `'DEBUG'` to get detailed error information in gateway responses. This is useful during development. Consider disabling it for production stages if the additional error detail could expose internal implementation details.


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreGateway } from 'stacktape';
export default defineConfig(() => {
  const toolGateway = new AgentCoreGateway({
    description: 'Dev gateway with debug logging',
    exceptionLevel: 'DEBUG',
    tools: []
  });

  return {
    resources: { toolGateway }
  };
});
```


## Overrides

Like all Stacktape resources, the AgentCore Gateway supports [CloudFormation overrides](/configuration/overrides-and-escape-hatches) for advanced customization. Use [`stacktape info:stack`](/cli/info-stack) to inspect stack details before writing overrides.

## API Reference


## API Reference: `AgentCoreGatewayProps`
```typescript
import type { AgentCoreGatewayTool, AgentCoreJwtAuthorizerConfig, CloudformationTag } from 'stacktape';

type AgentCoreGatewayProps = {
  authorizer?: AgentCoreJwtAuthorizerConfig;
  description?: string;
  exceptionLevel?: "DEBUG";
  instructions?: string;
  searchType?: string;
  supportedVersions?: Array<string>;
  tags?: Array<CloudformationTag>;
  tools?: Array<AgentCoreGatewayTool>;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `authorizer` | no | `AgentCoreJwtAuthorizerConfig` | - | - |
| `description` | no | `string` | - | - |
| `exceptionLevel` | no | `string = "DEBUG"` | - | - |
| `instructions` | no | `string` | - | - |
| `searchType` | no | `string` | - | - |
| `supportedVersions` | no | `Array<string>` | - | - |
| `tags` | no | `Array<CloudformationTag>` | - | - |
| `tools` | no | `Array<AgentCoreGatewayTool>` | - | - |


## Referenceable parameters

The following parameters are available via the [`$ResourceParam` directive](/configuration/directives). For example, to reference the gateway URL in an environment variable: `$ResourceParam('toolGateway', 'url')`.


## Referenceable Parameters: `agentcore-gateway`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `id` | Referenceable id value. | `$ResourceParam("<<resource-name>>", "id")` |
| `arn` | Referenceable arn value. | `$ResourceParam("<<resource-name>>", "arn")` |
| `url` | Referenceable url value. | `$ResourceParam("<<resource-name>>", "url")` |


## FAQ

### What is an AgentCore Gateway?

An AgentCore Gateway is a managed MCP tool gateway on AWS Bedrock AgentCore. It acts as a centralized registry where you define Lambda-backed tools, each with a declared input/output schema. AI agent runtimes connect to the gateway to discover and invoke these tools through the MCP protocol. Stacktape provisions the gateway and connects each tool to its backing Lambda function.

### How does the gateway relate to the AgentCore runtime?

The gateway provides tools; the [AgentCore runtime](/resources/ai/agentcore-runtime) consumes them. Set `useGateway: 'myGateway'` on the runtime to link it to the gateway. The gateway URL is available via `$ResourceParam('myGateway', 'url')` — pass it as an environment variable so your runtime code can discover and invoke tools via MCP. A single gateway can serve multiple runtimes.

### Can I use the gateway without JWT authentication?

Yes. The `authorizer` property is optional. Omitting it is acceptable for development stages or internal agents running in private environments. For production, configure the JWT authorizer to restrict access to authenticated callers.

### Which identity providers work with the JWT authorizer?

Configure `authorizer.discoveryUrl` with any provider that exposes a `.well-known/openid-configuration` endpoint, and optionally restrict accepted tokens by audience, client, and scope. OIDC discovery URLs are the expected shape — verify provider-specific compatibility with AWS Bedrock AgentCore.

### Can a single tool expose multiple operations?

Yes. Each tool's `toolSchema` is an array of operation definitions. For example, an "orders" tool can expose `getOrder`, `cancelOrder`, and `listOrders` — all backed by the same Lambda function. Consult the AWS Bedrock AgentCore documentation for the exact invocation payload structure delivered to your Lambda handler.

### How do I reference a Lambda function in another stack or AWS account?

Use the `lambdaArn` property instead of `function`. Provide the full ARN of the Lambda function (e.g., `arn:aws:lambda:us-east-1:123456789012:function:my-tool-handler`). If the Lambda is in a different AWS account, ensure its resource-based policy allows cross-account invocation.

### What is MCP and why does the gateway use it?

MCP (Model Context Protocol) is a standard for AI agents to discover and invoke tools. Unlike AgentCore runtime (which supports `HTTP`, `MCP`, `A2A`, and `AGUI` protocols), the gateway does not expose a configurable `protocol` property — it exposes MCP-related settings such as `instructions`, `supportedVersions`, and `searchType`. MCP provides structured tool discovery, typed input/output contracts, and a consistent invocation pattern, making it straightforward for agent frameworks to integrate.

### When should I use a gateway versus direct Lambda invocation?

Use a gateway when you have three or more tools, need schema-based tool discovery, or want a centralized authorization layer in front of your tools. For simpler setups with one or two Lambda functions, invoke them directly from your [AgentCore runtime](/resources/ai/agentcore-runtime) code using the standard resource access model — the gateway's indirection adds complexity that isn't justified for small tool sets.

### Which JSON Schema keys are supported in tool schemas?

Tool schemas are passed through to the AWS Bedrock AgentCore API. Both `inputSchema` (required) and `outputSchema` (optional) accept JSON Schema objects. Consult the AWS Bedrock AgentCore documentation for the exact keywords supported at the API level. In practice, keeping schemas simple and flat (`type`, `properties`, `required`, `items`, `description`) ensures broad compatibility.

### How much does an AgentCore Gateway cost?

The gateway is a managed AWS Bedrock AgentCore resource. Check the AWS Bedrock AgentCore pricing page for current rates, as pricing may vary by region and usage tier. You will also pay standard Lambda invocation and compute costs for each backing function that tools invoke.

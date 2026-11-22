# AgentCore Gateway

An `agentcore-gateway` is an Amazon Bedrock AgentCore Gateway: one MCP endpoint that exposes your Lambda functions as
tools an agent can discover and call. Each tool declares its operations with a JSON schema, and the gateway invokes the
function behind it. Use it when an agent needs several tools, or when other MCP clients should use the same tools.

For one or two functions, an agent can invoke them directly with `connectTo` and skip the gateway. Tools behind a gateway
must be Lambda functions.

## Basic example


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreGateway,
  AgentCoreRuntime,
  LambdaFunction,
  JsBundleLambdaPackaging,
  JsBundleImagePackaging
} from 'stacktape';
export default defineConfig(() => {
  const orderLookup = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/order-lookup.ts' })
  });

  const tools = new AgentCoreGateway({
    authorizer: {
      type: 'jwt',
      properties: {
        discoveryUrl:
          'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123/.well-known/openid-configuration',
        allowedAudience: ['my-app-client-id']
      }
    },
    tools: [
      {
        name: 'orders',
        function: 'orderLookup',
        toolSchema: [
          {
            name: 'lookupOrder',
            description: 'Find an order by its ID',
            inputSchema: {
              type: 'object',
              properties: { orderId: { type: 'string', description: 'The order ID' } },
              required: ['orderId']
            }
          }
        ]
      }
    ]
  });

  const agent = new AgentCoreRuntime({
    packaging: new JsBundleImagePackaging({ entryfilePath: './agent/server.ts' }),
    useGateway: 'tools'
  });

  return {
    resources: { orderLookup, tools, agent }
  };
});
```


`function` names a Lambda function in the stack; for a function elsewhere, use `lambdaArn`. Stacktape lets the gateway
invoke it. `useGateway` injects the gateway's MCP endpoint into the runtime as `STP_AGENTCORE_GATEWAY_URL`; connect an MCP
client to that URL.

## Write a tool function

The gateway invokes the function with the tool's arguments as the event. Which operation was called is in the Lambda
client context under `custom.bedrockAgentCoreToolName`, as `<target>___<operation>`; take the part after the last
`___`. The [AgentCore developer guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/) describes the
Lambda target format.

```typescript
import type { Context } from 'aws-lambda';

export default async (event: { orderId: string }, context: Context) => {
  const custom = (context.clientContext as { custom?: Record<string, string> } | undefined)?.custom;
  const operation = (custom?.bedrockAgentCoreToolName ?? '').split('___').pop();
  if (operation === 'lookupOrder') {
    return { orderId: event.orderId, status: 'shipped' };
  }
  throw new Error(`Unknown operation ${operation}`);
};
```

A tool can list several operations in `toolSchema`, all served by the same function. Each operation needs a `name` and
an `inputSchema`; `description` and `outputSchema` are optional. Keep schemas to plain JSON Schema (`type`,
`properties`, `required`, `items`, `description`). Stacktape passes them to AWS, which rejects what it doesn't support.

## Authorization

`authorizer` is required, because the gateway exposes every tool it lists:

- `type: 'jwt'` accepts only callers with a valid token from your identity provider. `discoveryUrl` points to the
  provider's `/.well-known/openid-configuration`; `allowedAudience`, `allowedClients` and `allowedScopes` narrow it
  down. For a [user auth pool](/resources/security/user-auth-pool), the URL is
  `https://cognito-idp.<region>.amazonaws.com/<user pool ID>/.well-known/openid-configuration`.
- `type: 'none'` lets anyone who reaches the endpoint call the tools. Use it only for tools that are safe in public.

With `jwt`, the agent must send a token with each request; `useGateway` doesn't give it one.

## Other settings

- `instructions` tells agents in plain language what the gateway is for and when to use which tool.
- `searchType: 'SEMANTIC'` lets agents search the tools by meaning, useful with many tools.
- `supportedVersions` limits the MCP protocol versions the gateway accepts.
- `exceptionLevel: 'DEBUG'` returns detailed errors. Turn it off in production, where the details can expose internals.

## Cost

AWS bills the gateway per tool call and per search, and the Lambda functions as usual. See
[AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/).

## Configuration reference


### Definition: `AgentCoreGatewayProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/agentcore` with definition name `AgentCoreGatewayProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `authorizer` | yes | `jwt \| none` | - |
| `description` | no | `string` | - |
| `exceptionLevel` | no | `string = "DEBUG"` | - |
| `instructions` | no | `string` | - |
| `searchType` | no | `string = "SEMANTIC"` | - |
| `supportedVersions` | no | `Array<string>` | - |
| `tags` | no | `Array<CloudformationTag>` | - |
| `tools` | no | `Array<AgentCoreGatewayTool>` | - |


## Referenceable parameters

| Parameter | Value |
|---|---|
| `id` | Gateway ID |
| `arn` | Gateway ARN |
| `url` | MCP endpoint URL |

## Next steps

- [AgentCore Runtime](/resources/ai/agentcore-runtime): the agent that calls the tools.
- [Lambda function](/resources/compute/lambda-function): memory, timeout and logs of the tool functions.
- [User auth pool](/resources/security/user-auth-pool): issue the tokens the JWT authorizer checks.

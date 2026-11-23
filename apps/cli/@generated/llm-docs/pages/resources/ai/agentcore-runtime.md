# AgentCore Runtime

An `agentcore-runtime` runs your AI agent as a container on Amazon Bedrock AgentCore Runtime. AWS starts an isolated
session per conversation, scales them and bills for the CPU and memory a session uses. Stacktape builds the image,
creates the runtime and its endpoints, and connects the agent to AgentCore [memory](/resources/ai/agentcore-memory), a
[gateway](/resources/ai/agentcore-gateway), a [browser](/resources/ai/agentcore-browser) and a
[code interpreter](/resources/ai/agentcore-code-interpreter).

For a service that calls a model and returns the answer, a [Lambda function](/resources/compute/lambda-function) or a
[web service](/resources/compute/web-service) is simpler.

## Basic example


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreRuntime, JsBundleImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const agent = new AgentCoreRuntime({
    packaging: new JsBundleImagePackaging({
      entryfilePath: './agent/server.ts'
    }),
    protocol: 'HTTP'
  });

  return {
    resources: { agent }
  };
});
```


With the `HTTP` protocol, AgentCore expects the container to listen on `0.0.0.0:8080` and answer two routes:

- `POST /invocations` with the request payload. Return JSON, or stream with server-sent events.
- `GET /ping`, the health check. Return `{"status":"Healthy"}`.

```typescript
// agent/server.ts
import { createServer } from 'node:http';

createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ status: 'Healthy' }));
    return;
  }
  if (req.method === 'POST' && req.url === '/invocations') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { prompt } = JSON.parse(body || '{}');
    // Call your model here.
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ answer: `You asked: ${prompt}` }));
    return;
  }
  res.writeHead(404).end();
}).listen(8080, '0.0.0.0');
```

AgentCore runs `linux/arm64` images. Stacktape builds the image for arm64; a `prebuilt-image` must be arm64 too. The
[AWS HTTP contract](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-http-protocol-contract.html)
has the details, including WebSocket support.

After `stacktape deploy`, get the runtime ARN and invoke it. The session ID groups requests of one conversation and must
be at least 33 characters:

```bash
stacktape param get agent arn --stage dev --region eu-west-1
```

```bash
aws bedrock-agentcore invoke-agent-runtime --region eu-west-1 \
  --agent-runtime-arn <runtime-arn> --qualifier default \
  --runtime-session-id "session-$(uuidgen)" \
  --payload '{"prompt":"Hello"}' --cli-binary-format raw-in-base64-out response.json
```

`response.json` then holds the agent's answer.

## Protocols

| `protocol` | Use when the container |
|----------|-------------|
| `HTTP` (default) | Serves `/invocations` and `/ping` as above |
| `MCP` | Is an [MCP](https://modelcontextprotocol.io/) server |
| `A2A` | Speaks the Agent-to-Agent protocol |
| `AGUI` | Implements the AG-UI protocol |

Each protocol has its own port and paths, described in the
[AgentCore developer guide](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/).

## Tools: memory, gateway, browser and code interpreter

Each tool is its own resource. Attach it by name, and Stacktape grants the runtime access and injects its identifier:

| Property | Resource | Injected variable |
|----------|----------|-------------------|
| `useMemory` | [AgentCore Memory](/resources/ai/agentcore-memory) | `STP_AGENTCORE_MEMORY_ID` |
| `useGateway` | [AgentCore Gateway](/resources/ai/agentcore-gateway) | `STP_AGENTCORE_GATEWAY_URL` |
| `useBrowser` | [AgentCore Browser](/resources/ai/agentcore-browser) | `STP_AGENTCORE_BROWSER_ID` |
| `useCodeInterpreter` | [AgentCore Code Interpreter](/resources/ai/agentcore-code-interpreter) | `STP_AGENTCORE_CODE_INTERPRETER_ID` |


Example (TypeScript):

```typescript
import {
  defineConfig,
  AgentCoreRuntime,
  AgentCoreMemory,
  AgentCoreBrowser,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const agentMemory = new AgentCoreMemory({});
  const browser = new AgentCoreBrowser({});

  const agent = new AgentCoreRuntime({
    packaging: new JsBundleImagePackaging({ entryfilePath: './agent/server.ts' }),
    protocol: 'HTTP',
    useMemory: 'agentMemory',
    useBrowser: 'browser'
  });

  return {
    resources: { agentMemory, browser, agent }
  };
});
```


The agent reads `process.env.STP_AGENTCORE_MEMORY_ID` and `process.env.STP_AGENTCORE_BROWSER_ID` and passes them to the
AgentCore SDK. Attach only what the agent uses: a browser or code interpreter adds its own sessions and charges.

## Endpoints

An endpoint is the address callers use, passed as `--qualifier` when invoking. Without `endpoints`, Stacktape creates one
named `default`. List names, or objects with a `description` and a pinned `runtimeVersion`:

```typescript
endpoints: ['default', { name: 'beta', description: 'Preview of the next version' }]
```

The `endpointName` and `endpointArn` parameters point to the endpoint named `default`, or to the first one if none has
that name.

## Sessions and lifecycle

AWS keeps a session alive between requests with the same session ID. `lifecycle` limits how long:

- `idleTimeoutSeconds` ends a session after it has been idle this long. AWS's default is 15 minutes.
- `maxLifetimeSeconds` ends a session after this long even while it's active. AWS's default is 8 hours.

```typescript
lifecycle: { idleTimeoutSeconds: 300, maxLifetimeSeconds: 7200 }
```

A shorter idle timeout lowers cost for agents that answer quickly. Keep it longer when users pause mid-conversation and
the agent holds state in memory.

## Authentication

Without an `authorizer`, callers sign requests with AWS credentials that are allowed to invoke the runtime. To let users
call it with tokens from your identity provider, set a JWT authorizer:

```typescript
authorizer: {
  discoveryUrl: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123/.well-known/openid-configuration',
  allowedAudience: ['my-app-client-id'],
  allowedClients: ['trusted-client'],
  allowedScopes: ['agent:invoke']
}
```

`discoveryUrl` is required; the other three are optional filters on the token's claims.

## Access to other resources

The runtime's role allows every `bedrock:*`, `bedrock-agentcore:*` and `bedrock-agentcore-control:*` action on all
resources, so the agent can call Bedrock models and AgentCore tools without extra permissions. Keep that in mind when
you review what the agent's code is allowed to do.

`connectTo` gives the agent access to resources in the stack and injects their parameters, for example
`STP_CONVERSATIONS_NAME` for a DynamoDB table named `conversations`. For other AWS services, add `iamRoleStatements`.

`environment` passes other settings; put secrets there with [`$Secret()`](/configuration/directives).
`requestHeaders` lists request headers, such as `X-Tenant-Id`, that AgentCore forwards to the container.

## Packaging

AgentCore Runtime takes the [container packaging](/packaging/overview) types: `js-bundle` (`JsBundleImagePackaging`) for
one TypeScript or JavaScript entry file, `buildpack` for Python and other languages without a Dockerfile, `dockerfile`
for full control, and `prebuilt-image` for an existing arm64 image.

## Cost

AgentCore Runtime bills per second for the CPU and memory a session actually uses, and doesn't charge CPU while the agent
waits for a model or a tool. Model calls, memory, gateway and browser are billed separately. See
[AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/).

## Configuration reference


### Definition: `AgentCoreRuntimeProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/agentcore` with definition name `AgentCoreRuntimeProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packaging` | yes | `js-bundle \| prebuilt-image \| dockerfile \| buildpack` | - |
| `authorizer` | no | `AgentCoreJwtAuthorizerConfig` | - |
| `connectTo` | no | `Array<string>` | - |
| `description` | no | `string` | - |
| `endpoints` | no | `Array<AgentCoreRuntimeEndpoint \| option-2>` | - |
| `environment` | no | `Array<EnvironmentVar>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `lifecycle` | no | `AgentCoreRuntimeLifecycleConfig` | - |
| `protocol` | no | `string: "A2A" \| "AGUI" \| "HTTP" \| "MCP"` | - |
| `requestHeaders` | no | `Array<string>` | - |
| `tags` | no | `Array<CloudformationTag>` | - |
| `useBrowser` | no | `string` | - |
| `useCodeInterpreter` | no | `string` | - |
| `useGateway` | no | `string` | - |
| `useMemory` | no | `string` | - |


## Referenceable parameters

| Parameter | Value |
|-----------|-------|
| `id` | Runtime ID |
| `arn` | Runtime ARN, used to invoke it |
| `endpointName` | Name of the referenced endpoint |
| `endpointArn` | ARN of the referenced endpoint |

## Next steps

- [AgentCore Memory](/resources/ai/agentcore-memory): keep context across sessions.
- [AgentCore Gateway](/resources/ai/agentcore-gateway): give the agent tools behind one MCP endpoint.
- [Secrets](/configuration/secrets): store model provider keys.

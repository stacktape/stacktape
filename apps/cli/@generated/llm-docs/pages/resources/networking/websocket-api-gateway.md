# WebSocket API Gateway

A WebSocket API Gateway is a `wss://` endpoint, run by AWS API Gateway, whose routes are Lambda functions: `$connect`,
`$disconnect`, `$default` and your own, such as `sendMessage`. It suits chat, live notifications, job progress and
presence without an always-on server. Stacktape creates the API, the routes, the permissions to send to connections,
and the access logs.

You pay $1 per million messages (32 KB each) and $0.25 per million connection-minutes in us-east-1, and nothing while
idle ([API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/)). If you already run a WebSocket server such
as Socket.IO in a container, put it behind an [Application Load Balancer](/resources/networking/application-load-balancer)
instead.

Clients pick a route with the `action` field of a JSON message: `{ "action": "sendMessage", "text": "hello" }` invokes
the function that owns `sendMessage`.

## Basic example

Routes live on the functions, not on the gateway. Route handlers get the gateway's variables and permission to send to
its connections without `connectTo`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  WebSocketApiGateway,
  WebSocketApiIntegration,
  JsBundleLambdaPackaging
} from 'stacktape';

export default defineConfig(() => {
  const realtime = new WebSocketApiGateway({});

  const connections = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/connections.ts'
    }),
    events: [
      new WebSocketApiIntegration({
        websocketApiGatewayName: realtime,
        routeKey: '$connect'
      }),
      new WebSocketApiIntegration({
        websocketApiGatewayName: realtime,
        routeKey: '$disconnect'
      })
    ]
  });

  const messages = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/messages.ts'
    }),
    events: [
      new WebSocketApiIntegration({
        websocketApiGatewayName: realtime,
        routeKey: 'sendMessage'
      }),
      new WebSocketApiIntegration({
        websocketApiGatewayName: realtime,
        routeKey: '$default'
      })
    ]
  });

  return { resources: { realtime, connections, messages } };
});
```


Example (YAML):

```yaml
resources:
  realtime:
    type: websocket-api-gateway

  connections:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/connections.ts
      events:
        - type: websocket-api-gateway
          properties:
            websocketApiGatewayName: realtime
            routeKey: $connect
        - type: websocket-api-gateway
          properties:
            websocketApiGatewayName: realtime
            routeKey: $disconnect

  messages:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/messages.ts
      events:
        - type: websocket-api-gateway
          properties:
            websocketApiGatewayName: realtime
            routeKey: sendMessage
        - type: websocket-api-gateway
          properties:
            websocketApiGatewayName: realtime
            routeKey: $default
```


The deploy prints the `wss://` URL. Connect to it with any WebSocket client, for example `npx wscat -c <url>`, and send
`{"action":"sendMessage","text":"hello"}`. Route changes deploy with the stack; there is no API Gateway stage to manage.

## Route behavior

| Route | When it runs |
|---|---|
| `$connect` | During the opening handshake. Returning an error rejects the connection. |
| `$disconnect` | After a connection closes. Delivery is best-effort and is not guaranteed. |
| `$default` | When no custom route matches, including messages that cannot be selected. |
| Custom key | When the route selection expression resolves to that key. |

Only JSON messages can be selected by `$request.body.action`. Non-JSON messages and JSON without a matching action go to `$default` when that route exists.

Route handler return bodies are not sent to the client by default. Use `returnResponse: true` for a simple reply to the calling client, as described below. Use the API Gateway Management API when the application should send later, broadcast, or target a different connection.

## Sending a message to a connection

For a gateway named `realtime`, every route handler receives:

- `STP_REALTIME_URL`: the public `wss://` client URL
- `STP_REALTIME_MANAGEMENT_ENDPOINT`: the HTTPS endpoint for `ApiGatewayManagementApiClient`
- `STP_REALTIME_API_ID`: the API ID
- `STP_REALTIME_CANONICAL_DOMAIN`: the AWS DNS target

The handler also gets connection-management permission scoped to this gateway and Stacktape's managed stage.

```ts
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from '@aws-sdk/client-apigatewaymanagementapi';

const client = new ApiGatewayManagementApiClient({
  endpoint: process.env.STP_REALTIME_MANAGEMENT_ENDPOINT
});

export default async (event) => {
  await client.send(
    new PostToConnectionCommand({
      ConnectionId: event.requestContext.connectionId,
      Data: Buffer.from(JSON.stringify({ type: 'ack' }))
    })
  );

  return { statusCode: 200 };
};
```

Do not post to the connection from `$connect`: the connection does not exist until that handler succeeds. Handle `GoneException` when a connection has already closed.

Other producers can send to clients too. Add `connectTo: [realtime]` to a different Lambda, container workload, batch job, or script to receive the same scoped permission and environment variables. The permission covers `PostToConnection`, `GetConnection` and `DeleteConnection` on every connection of the gateway's stage.

## Connection storage and broadcasts

Stacktape does not create a DynamoDB connection registry automatically. A direct reply needs only the `connectionId` in the current event, while broadcast, rooms, and user-to-connection lookup each need different application data. An automatic table would impose the wrong schema on many applications.

When you need lookup or broadcast:

1. Add a normal [DynamoDB table](/resources/databases/dynamodb) for the fields your application needs.
2. Connect the `$connect`, `$disconnect`, and broadcasting workloads to that table with `connectTo`.
3. Store connection IDs with a TTL.
4. Delete stale records when a Management API send returns `GoneException`.

TTL and failed-send cleanup matter because `$disconnect` is best-effort and may not run.

## Authorization

Authorization is optional and belongs on the `$connect` route because API Gateway authorizes a WebSocket connection only while opening it. Later messages use the identity established at connection time and any checks in your application code.

For application-specific authentication, use a Lambda REQUEST authorizer:

```ts
const connect = new LambdaFunction({
  packaging: new JsBundleLambdaPackaging({
    entryfilePath: './src/connect.ts'
  }),
  events: [
    new WebSocketApiIntegration({
      websocketApiGatewayName: realtime,
      routeKey: '$connect',
      authorizer: {
        type: 'lambda',
        properties: {
          functionName: authorizeConnection
        }
      }
    })
  ]
});
```

The default identity source is `route.request.header.Authorization`. You can explicitly use header or query-string sources such as `route.request.querystring.token`. A WebSocket Lambda authorizer returns an IAM policy response; the HTTP API simple-response and JWT/Cognito authorizer settings do not apply.

Use `{ type: 'aws-iam' }` only for clients that can sign the opening request with AWS Signature Version 4. It is usually unsuitable for ordinary browser clients.

## Return a response to the calling client

WebSocket routes are one-way by default. For a simple request-response interaction on `$default` or a custom message route, set `returnResponse: true` and return a `body` from the Lambda handler:

```ts
new WebSocketApiIntegration({
  websocketApiGatewayName: realtime,
  routeKey: 'getStatus',
  returnResponse: true
});
```

```ts
export default async () => ({
  statusCode: 200,
  body: JSON.stringify({ status: 'ready' })
});
```

Stacktape configures the API Gateway route response, and only the client that invoked the route receives the returned body. Lifecycle routes (`$connect` and `$disconnect`) cannot use `returnResponse`, because no established calling connection is available for that reply. Keep the default for broadcasts, delayed responses, and messages sent to a different connection; use the management endpoint for those cases.

## Custom domains

Add `customDomains` when clients should connect through your own hostname:

```ts
const realtime = new WebSocketApiGateway({
  customDomains: [{ domainName: 'realtime.example.com' }]
});
```

[Set up the domain](/resources/networking/custom-domains#set-up-the-domain) with `stacktape domain add` first, so an
issued certificate for the hostname exists in the stack's region. The deploy then creates the domain mapping and the
Route 53 record. For DNS or certificates you manage elsewhere, use `disableDnsRecordCreation` or
`customCertificateArn`; see [Custom domains](/resources/networking/custom-domains#external-dns).

One API Gateway hostname can't serve both a WebSocket API and an HTTP API, so give each its own name. Stacktape rejects
the config before deploying.

## Logs

JSON access logs are enabled by default with connection ID, event type, route, status, source IP, request time, and integration error context. Payload data is not logged by default. Configure retention or forwarding through `logging`, or set `logging.disabled: true`.

API Gateway needs a CloudWatch Logs role in the account's API Gateway settings to write these logs, and new accounts
have none. Before the deploy, Stacktape checks the region's setting. If no role is set, it creates the IAM role
`stacktape-api-gateway-cloudwatch-logs` (one per account, with the AWS managed policy
`AmazonAPIGatewayPushToCloudWatchLogs`), registers it and says so. It never replaces a role that is already set; if
that role was deleted, the deploy stops and says so.

Restricted deployer roles need `apigateway:GET` on `/account` for the check (without it, Stacktape warns and deploys),
and `iam:GetRole`, `iam:CreateRole`, `iam:AttachRolePolicy`, `iam:PassRole` on the role and `apigateway:PATCH` on
`/account` to register it.

`logging.logClass: 'infrequent-access'` lowers the ingestion price for new log groups. Those logs can be read only with
Logs Insights and can't be forwarded.

## Dev mode

`stacktape dev` keeps the WebSocket gateway deployed and hot-swaps its Lambda handlers. Dev stages have no access logs. The dev UI shows the deployed `wss://` URL. Stacktape does not emulate API Gateway's connection lifecycle locally, so test clients continue to use the deployed endpoint while code changes are updated quickly.

## AWS limits to design around

API Gateway currently limits a connection to 2 hours with a 10-minute idle timeout. Frames are limited to 32 KB, messages to 128 KB, binary frames are unsupported, and integrations can run for at most 29 seconds. Split large payloads and design clients to reconnect.

## Configuration reference


### Definition: `WebSocketApiGatewayProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/websocket-api-gateways` with definition name `WebSocketApiGatewayProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `customDomains` | no | `Array<DomainConfiguration>` | - |
| `logging` | no | `WebSocketApiAccessLogsConfig` | - |
| `routeSelectionExpression` | no | `string` | `$request.body.action` |


### Definition: `WebSocketApiIntegrationProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/events` with definition name `WebSocketApiIntegrationProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `routeKey` | yes | `string` | - |
| `websocketApiGatewayName` | yes | `string` | - |
| `authorizer` | no | `aws-iam \| lambda` | - |
| `returnResponse` | no | `boolean` | `false` |


## Referenceable parameters

Use `$ResourceParam('realtime', 'paramName')` in configuration. `connectTo` injects these values into workloads automatically.


## Referenceable Parameters: `websocket-api-gateway`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `apiId` | API Gateway ID | `$ResourceParam("<<resource-name>>", "apiId")` |
| `url` | WebSocket client URL | `$ResourceParam("<<resource-name>>", "url")` |
| `managementEndpoint` | HTTPS endpoint for sending messages to connected clients | `$ResourceParam("<<resource-name>>", "managementEndpoint")` |
| `canonicalDomain` | AWS DNS target | `$ResourceParam("<<resource-name>>", "canonicalDomain")` |
| `customDomains` | Comma-separated list of custom domain names | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `customDomainUrls` | Comma-separated list of custom domain URLs | `$ResourceParam("<<resource-name>>", "customDomainUrls")` |
| `customDomainUrl` | URL of the first custom domain | `$ResourceParam("<<resource-name>>", "customDomainUrl")` |


## Next steps

- [DynamoDB table](/resources/databases/dynamodb): store connection IDs for broadcasts.
- [User auth pool](/resources/security/user-auth-pool): authorize connections.
- [Lambda function](/resources/compute/lambda-function): memory, timeout and logs of the route handlers.

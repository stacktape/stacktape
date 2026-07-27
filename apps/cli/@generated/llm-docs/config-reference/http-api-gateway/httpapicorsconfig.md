# HttpApiCorsConfig API Reference

Resource type: `http-api-gateway`

## TypeScript definition

```typescript
type HttpApiCorsConfig = {
  /** Enable CORS. With no other options, uses permissive defaults (* origins, common headers). */
  enabled: boolean;
  /** Allow cookies/auth headers in cross-origin requests. */
  allowCredentials?: boolean;
  /** Allowed request headers in CORS preflight. */
  allowedHeaders?: Array<string>;
  /** Allowed HTTP methods. Auto-detected from integrations if not set. */
  allowedMethods?: Array<"*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT">;
  /** Allowed origins (e.g., https://myapp.com). Use * for any origin. */
  allowedOrigins?: Array<string>;
  /** Response headers accessible to browser JavaScript. */
  exposedResponseHeaders?: Array<string>;
  /** How long (seconds) browsers can cache preflight responses. */
  maxAge?: number;
};
```

## Property: `enabled`

- Required: yes
- Type: `boolean`
- Default: `false`

Enable CORS. With no other options, uses permissive defaults (`*` origins, common headers).

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `allowCredentials`

- Required: no
- Type: `boolean`

Allow cookies/auth headers in cross-origin requests.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
        allowedOrigins:
          - https://app.example.com
        allowCredentials: true
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true,
      allowedOrigins: ['https://app.example.com'],
      allowCredentials: true
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `allowedHeaders`

- Required: no
- Type: `Array<string>`

Allowed request headers in CORS preflight.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
        allowedOrigins:
          - https://app.example.com
        allowedHeaders:
          - Content-Type
          - Authorization
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true,
      allowedOrigins: ['https://app.example.com'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `allowedMethods`

- Required: no
- Type: `Array<string: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT">`

Allowed HTTP methods. Auto-detected from integrations if not set.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
        allowedOrigins:
          - https://app.example.com
        allowedMethods:
          - GET
          - POST
          - OPTIONS
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true,
      allowedOrigins: ['https://app.example.com'],
      allowedMethods: ['GET', 'POST', 'OPTIONS']
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `allowedOrigins`

- Required: no
- Type: `Array<string>`
- Default: `["*"]`

Allowed origins (e.g., `https://myapp.com`). Use `*` for any origin.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
        allowedOrigins:
          - https://app.example.com
          - https://admin.example.com
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true,
      allowedOrigins: ['https://app.example.com', 'https://admin.example.com']
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `exposedResponseHeaders`

- Required: no
- Type: `Array<string>`

Response headers accessible to browser JavaScript.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
        allowedOrigins:
          - https://app.example.com
        exposedResponseHeaders:
          - X-Request-Id
          - X-Total-Count
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true,
      allowedOrigins: ['https://app.example.com'],
      exposedResponseHeaders: ['X-Request-Id', 'X-Total-Count']
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `maxAge`

- Required: no
- Type: `number`

How long (seconds) browsers can cache preflight responses.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
        allowedOrigins:
          - https://app.example.com
        maxAge: 3600
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 512
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /{proxy+}
            method: '*'
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true,
      allowedOrigins: ['https://app.example.com'],
      maxAge: 3600
    }
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

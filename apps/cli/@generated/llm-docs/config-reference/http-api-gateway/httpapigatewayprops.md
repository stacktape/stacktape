# HttpApiGatewayProps API Reference

Resource type: `http-api-gateway`

## TypeScript definition

```typescript
import type { CdnConfiguration, DomainConfiguration, HttpApiAccessLogsConfig, HttpApiCorsConfig, HttpApiGatewayAlarm } from 'stacktape';

type HttpApiGatewayProps = {
  /** Alarms for this API Gateway (merged with global alarms from the Stacktape Console). */
  alarms?: Array<HttpApiGatewayAlarm>;
  /** Put a CDN (CloudFront) in front of this API for caching and lower latency worldwide. */
  cdn?: CdnConfiguration;
  /** CORS settings. Overrides any CORS headers from your application code. */
  cors?: HttpApiCorsConfig;
  /** Custom domains (e.g., api.example.com). Stacktape auto-creates DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Global alarm names to exclude from this API Gateway. */
  disabledGlobalAlarms?: Array<string>;
  /** Access logging (request ID, IP, method, status, etc.). Viewable with stacktape logs. */
  logging?: HttpApiAccessLogsConfig;
  /** Lambda event payload format. 2.0 is simpler and recommended for new projects. */
  payloadFormat?: "1.0" | "2.0";
};
```

## Property: `alarms`

- Required: no
- Type: `Array<HttpApiGatewayAlarm>`

Alarms for this API Gateway (merged with global alarms from the Stacktape Console).

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      alarms:
        - trigger:
            type: http-api-gateway-error-rate
            properties:
              thresholdPercent: 5
          notificationTargets:
            - type: email
              properties:
                sender: alerts@example.com
                recipient: ops@example.com
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
    alarms: [
      {
        trigger: {
          type: 'http-api-gateway-error-rate',
          properties: { thresholdPercent: 5 }
        },
        notificationTargets: [
          { type: 'email', properties: { sender: 'alerts@example.com', recipient: 'ops@example.com' } }
        ]
      }
    ]
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `cdn`

- Required: no
- Type: `CdnConfiguration`

Put a CDN (CloudFront) in front of this API for caching and lower latency worldwide.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cdn:
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
    cdn: {
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

## Property: `cors`

- Required: no
- Type: `HttpApiCorsConfig`

CORS settings. Overrides any CORS headers from your application code.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
        allowedOrigins:
          - https://myapp.com
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
      allowedOrigins: ['https://myapp.com']
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

## Property: `customDomains`

- Required: no
- Type: `Array<DomainConfiguration>`

Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.

Your domain must be added as a Route53 hosted zone in your AWS account first.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: api.example.com
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
    customDomains: [{ domainName: 'api.example.com' }]
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `disabledGlobalAlarms`

- Required: no
- Type: `Array<string>`

Global alarm names to exclude from this API Gateway.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      disabledGlobalAlarms:
        - global-api-latency
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
    disabledGlobalAlarms: ['global-api-latency']
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

## Property: `logging`

- Required: no
- Type: `HttpApiAccessLogsConfig`

Access logging (request ID, IP, method, status, etc.). Viewable with `stacktape logs`.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      logging:
        format: JSON
        retentionDays: 90
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
    logging: {
      format: 'JSON',
      retentionDays: 90
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

## Property: `payloadFormat`

- Required: no
- Type: `string: "1.0" | "2.0"`

Lambda event payload format. `2.0` is simpler and recommended for new projects.

Only used if not overridden at the integration level.

### Example 1 (yaml)

```yaml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      payloadFormat: '2.0'
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
    payloadFormat: '2.0'
  });
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
    memory: 512,
    events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
  });
  return { resources: { apiGateway, apiHandler } };
});
```

# Http Api Gateway

Resource type: `http-api-gateway`

## TypeScript Definition

```typescript
/**
 * #### Serverless HTTP API with pay-per-request pricing (~$1/million requests).
 *
 * ---
 *
 * Routes HTTP requests to Lambda functions, containers, or other backends.
 * No servers to manage. Includes built-in throttling, CORS, and TLS.
 */
interface HttpApiGateway {
  type: 'http-api-gateway';
  properties?: HttpApiGatewayProps;
  overrides?: ResourceOverrides;
}

interface HttpApiGatewayProps {
  /**
   * #### Lambda event payload format. `2.0` is simpler and recommended for new projects.
   *
   * ---
   *
   * Only used if not overridden at the integration level.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       payloadFormat: '2.0'
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     payloadFormat: '2.0'
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  payloadFormat?: '1.0' | '2.0';
  /**
   * #### CORS settings. Overrides any CORS headers from your application code.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://myapp.com
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://myapp.com']
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  cors?: HttpApiCorsConfig;
  /**
   * #### Access logging (request ID, IP, method, status, etc.). Viewable with `stacktape logs`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       logging:
   *         format: JSON
   *         retentionDays: 90
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     logging: {
   *       format: 'JSON',
   *       retentionDays: 90
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  logging?: HttpApiAccessLogsConfig;
  /**
   * #### Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       customDomains:
   *         - domainName: api.example.com
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     customDomains: [{ domainName: 'api.example.com' }]
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Put a CDN (CloudFront) in front of this API for caching and lower latency worldwide.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cdn:
   *         enabled: true
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cdn: {
   *       enabled: true
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  cdn?: CdnConfiguration;
  /**
   * #### Alarms for this API Gateway (merged with global alarms from the Stacktape Console).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       alarms:
   *         - trigger:
   *             type: http-api-gateway-error-rate
   *             properties:
   *               thresholdPercent: 5
   *           notificationTargets:
   *             - type: email
   *               properties:
   *                 sender: alerts@example.com
   *                 recipient: ops@example.com
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     alarms: [
   *       {
   *         trigger: {
   *           type: 'http-api-gateway-error-rate',
   *           properties: { thresholdPercent: 5 }
   *         },
   *         notificationTargets: [
   *           { type: 'email', properties: { sender: 'alerts@example.com', recipient: 'ops@example.com' } }
   *         ]
   *       }
   *     ]
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  alarms?: HttpApiGatewayAlarm[];
  /**
   * #### Global alarm names to exclude from this API Gateway.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       disabledGlobalAlarms:
   *         - global-api-latency
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     disabledGlobalAlarms: ['global-api-latency']
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  disabledGlobalAlarms?: string[];
}

interface HttpApiAccessLogsConfig extends LogForwardingBase {
  /**
   * #### Disable access logging.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       logging:
   *         disabled: true
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     logging: {
   *       disabled: true
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### Log format. Logs include: requestId, IP, method, status, protocol, responseLength.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       logging:
   *         format: CLF
   *         retentionDays: 30
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     logging: {
   *       format: 'CLF',
   *       retentionDays: 30
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   *
   * @default JSON
   */
  format?: 'CLF' | 'JSON' | 'XML' | 'CSV';
  /**
   * #### How many days to keep logs.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       logging:
   *         format: JSON
   *         retentionDays: 365
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     logging: {
   *       format: 'JSON',
   *       retentionDays: 365
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   *
   * @default 30
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';

interface HttpApiCorsConfig {
  /**
   * #### Enable CORS. With no other options, uses permissive defaults (`*` origins, common headers).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cors:
   *         enabled: true
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cors: {
   *       enabled: true
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### Allowed origins (e.g., `https://myapp.com`). Use `*` for any origin.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://app.example.com
   *           - https://admin.example.com
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://app.example.com', 'https://admin.example.com']
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   *
   * @default ["*"]
   */
  allowedOrigins?: string[];
  /**
   * #### Allowed request headers in CORS preflight.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://app.example.com
   *         allowedHeaders:
   *           - Content-Type
   *           - Authorization
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://app.example.com'],
   *       allowedHeaders: ['Content-Type', 'Authorization']
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  allowedHeaders?: string[];
  /**
   * #### Allowed HTTP methods. Auto-detected from integrations if not set.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://app.example.com
   *         allowedMethods:
   *           - GET
   *           - POST
   *           - OPTIONS
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://app.example.com'],
   *       allowedMethods: ['GET', 'POST', 'OPTIONS']
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  allowedMethods?: HttpMethod[];
  /**
   * #### Allow cookies/auth headers in cross-origin requests.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://app.example.com
   *         allowCredentials: true
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://app.example.com'],
   *       allowCredentials: true
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  allowCredentials?: boolean;
  /**
   * #### Response headers accessible to browser JavaScript.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://app.example.com
   *         exposedResponseHeaders:
   *           - X-Request-Id
   *           - X-Total-Count
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://app.example.com'],
   *       exposedResponseHeaders: ['X-Request-Id', 'X-Total-Count']
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  exposedResponseHeaders?: string[];
  /**
   * #### How long (seconds) browsers can cache preflight responses.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiGateway:
   *     type: http-api-gateway
   *     properties:
   *       cors:
   *         enabled: true
   *         allowedOrigins:
   *           - https://app.example.com
   *         maxAge: 3600
   *   apiHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/index.ts
   *       memory: 512
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: apiGateway
   *             path: /{proxy+}
   *             method: '*'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HttpApiGateway, HttpApiIntegration, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiGateway = new HttpApiGateway({
   *     cors: {
   *       enabled: true,
   *       allowedOrigins: ['https://app.example.com'],
   *       maxAge: 3600
   *     }
   *   });
   *   const apiHandler = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/index.ts' }),
   *     memory: 512,
   *     events: [new HttpApiIntegration({ httpApiGatewayName: 'apiGateway', path: '/{proxy+}', method: '*' })]
   *   });
   *   return { resources: { apiGateway, apiHandler } };
   * });
   * ```
   */
  maxAge?: number;
}

type HttpApiGatewayReferencableParam =
  | 'domain'
  | 'customDomains'
  | 'url'
  | 'customDomainUrl'
  | 'customDomainUrls'
  | 'canonicalDomain'
  | CdnReferenceableParam;

type HttpApiGatewayOutputs = {
  integrations: {
    url: string | IntrinsicFunction;
    method: string;
    resourceName: string;
  }[];
};
```

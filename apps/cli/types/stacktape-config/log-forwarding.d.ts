interface LogForwardingBase {
  /**
   * #### Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).
   *
   * ---
   *
   * Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       timeout: 10
   *       logging:
   *         retentionDays: 90
   *         # stp-focus
   *         logForwarding:
   *           type: datadog
   *           properties:
   *             apiKey: $Secret('datadog.apiKey')
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     timeout: 10,
   *     logging: {
   *       retentionDays: 90,
   *       // stp-focus
   *       logForwarding: {
   *         type: 'datadog',
   *         properties: { apiKey: $Secret('datadog.apiKey') }
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  logForwarding?: HttpEndpointLogForwarding | HighlightLogForwarding | DatadogLogForwarding;
}

interface HttpEndpointLogForwarding {
  type: 'http-endpoint';
  properties: HttpEndpointLogForwardingProps;
}

interface HttpEndpointLogForwardingProps {
  /**
   * #### HTTPS endpoint URL where logs are sent.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: http-endpoint
   *           properties:
   *             # stp-focus
   *             endpointUrl: https://logs.example.com/v1/ingest
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'http-endpoint',
   *         properties: {
   *           // stp-focus
   *           endpointUrl: 'https://logs.example.com/v1/ingest'
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  endpointUrl: string;
  /**
   * #### Compress request body with GZIP to reduce transfer costs.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: http-endpoint
   *           properties:
   *             endpointUrl: https://logs.example.com/v1/ingest
   *             # stp-focus
   *             gzipEncodingEnabled: true
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'http-endpoint',
   *         properties: {
   *           endpointUrl: 'https://logs.example.com/v1/ingest',
   *           // stp-focus
   *           gzipEncodingEnabled: true
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   *
   * @default false
   */
  gzipEncodingEnabled?: boolean;
  /**
   * #### Extra metadata sent in the `X-Amz-Firehose-Common-Attributes` header.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: http-endpoint
   *           properties:
   *             endpointUrl: https://logs.example.com/v1/ingest
   *             # stp-focus
   *             parameters:
   *               environment: production
   *               team: backend
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'http-endpoint',
   *         properties: {
   *           endpointUrl: 'https://logs.example.com/v1/ingest',
   *           // stp-focus
   *           parameters: {
   *             environment: 'production',
   *             team: 'backend'
   *           }
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  parameters?: { [paramName: string]: string };
  /**
   * #### Total retry time (seconds) before sending failed logs to a backup S3 bucket.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: http-endpoint
   *           properties:
   *             endpointUrl: https://logs.example.com/v1/ingest
   *             # stp-focus
   *             retryDuration: 600
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'http-endpoint',
   *         properties: {
   *           endpointUrl: 'https://logs.example.com/v1/ingest',
   *           // stp-focus
   *           retryDuration: 600
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   *
   * @default 300
   */
  retryDuration?: number;
  /**
   * #### Auth credential sent in `X-Amz-Firehose-Access-Key` header. Store as `$Secret()` for security.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: http-endpoint
   *           properties:
   *             endpointUrl: https://logs.example.com/v1/ingest
   *             # stp-focus
   *             accessKey: $Secret('logForwarding.accessKey')
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'http-endpoint',
   *         properties: {
   *           endpointUrl: 'https://logs.example.com/v1/ingest',
   *           // stp-focus
   *           accessKey: $Secret('logForwarding.accessKey')
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  accessKey?: string;
}

interface HighlightLogForwarding {
  type: 'highlight';
  properties: HighlightLogForwardingProps;
}

interface HighlightLogForwardingProps {
  /**
   * #### Your Highlight.io project ID (from the Highlight console).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: highlight
   *           properties:
   *             # stp-focus
   *             projectId: "1jdkoe52"
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'highlight',
   *         properties: {
   *           // stp-focus
   *           projectId: '1jdkoe52'
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  projectId: string;
  /**
   * #### Highlight.io endpoint. Override for self-hosted or regional endpoints.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: highlight
   *           properties:
   *             projectId: "1jdkoe52"
   *             # stp-focus
   *             endpointUrl: https://pub.highlight.io/v1/logs/firehose
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'highlight',
   *         properties: {
   *           projectId: '1jdkoe52',
   *           // stp-focus
   *           endpointUrl: 'https://pub.highlight.io/v1/logs/firehose'
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   *
   * @default "https://pub.highlight.io/v1/logs/firehose"
   */
  endpointUrl?: string;
}

interface DatadogLogForwarding {
  type: 'datadog';
  properties: DatadogLogForwardingProps;
}

interface DatadogLogForwardingProps {
  /**
   * #### Your Datadog API key. Store as `$Secret()` for security.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: datadog
   *           properties:
   *             # stp-focus
   *             apiKey: $Secret('datadog.apiKey')
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'datadog',
   *         properties: {
   *           // stp-focus
   *           apiKey: $Secret('datadog.apiKey')
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   */
  apiKey: string;
  /**
   * #### Datadog endpoint. Use the EU URL if your account is in the EU region.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   apiFunction:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   *       memory: 512
   *       logging:
   *         logForwarding:
   *           type: datadog
   *           properties:
   *             apiKey: $Secret('datadog.apiKey')
   *             # stp-focus
   *             endpointUrl: https://aws-kinesis-http-intake.logs.datadoghq.eu/v1/input
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const apiFunction = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
   *     memory: 512,
   *     logging: {
   *       logForwarding: {
   *         type: 'datadog',
   *         properties: {
   *           apiKey: $Secret('datadog.apiKey'),
   *           // stp-focus
   *           endpointUrl: 'https://aws-kinesis-http-intake.logs.datadoghq.eu/v1/input'
   *           // stp-end-focus
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { apiFunction } };
   * });
   * ```
   *
   * @default "https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input"
   */
  endpointUrl?: string;
}

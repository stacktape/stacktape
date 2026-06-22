# Custom Resource Definition

Resource type: `custom-resource`

## TypeScript Definition

```typescript
/**
 * #### Lambda-backed provisioning logic for resources not natively supported by Stacktape/CloudFormation.
 *
 * ---
 *
 * Your Lambda function runs on stack create, update, and delete events to manage external resources
 * (third-party APIs, SaaS services, custom infrastructure). Pair with `custom-resource-instance` to use.
 */
interface CustomResourceDefinition {
  type: 'custom-resource-definition';
  properties: CustomResourceDefinitionProps;
  overrides?: ResourceOverrides;
}

/**
 * #### An instance of a `custom-resource-definition`. Pass properties to the backing Lambda function.
 */
interface CustomResourceInstance {
  type: 'custom-resource-instance';
  properties: CustomResourceInstanceProps;
  overrides?: ResourceOverrides;
}

interface CustomResourceInstanceProps {
  /**
   * #### Name of the `custom-resource-definition` in your config that provides the backing Lambda.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   slackProvisioner:
   *     type: custom-resource-definition
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: provisioners/slack-channel.ts
   *       runtime: nodejs22.x
   *       timeout: 60
   *   releaseChannel:
   *     type: custom-resource-instance
   *     properties:
   *       definitionName: slackProvisioner
   *       resourceProperties:
   *         channelName: product-releases
   *         isPrivate: false
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { CustomResourceDefinition, CustomResourceInstance, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const slackProvisioner = new CustomResourceDefinition({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'provisioners/slack-channel.ts' }
   *     },
   *     runtime: 'nodejs22.x',
   *     timeout: 60
   *   });
   *
   *   const releaseChannel = new CustomResourceInstance({
   *     definitionName: 'slackProvisioner',
   *     resourceProperties: { channelName: 'product-releases', isPrivate: false }
   *   });
   *
   *   return { resources: { slackProvisioner, releaseChannel } };
   * });
   * ```
   */
  definitionName: string;
  /**
   * #### Key-value pairs passed to the Lambda function during create/update/delete events.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   dnsProvisioner:
   *     type: custom-resource-definition
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: provisioners/cloudflare-dns.ts
   *       environment:
   *         - name: CLOUDFLARE_API_TOKEN
   *           value: $Secret('cloudflare-token')
   *       timeout: 120
   *   appDnsRecord:
   *     type: custom-resource-instance
   *     properties:
   *       definitionName: dnsProvisioner
   *       resourceProperties:
   *         recordType: CNAME
   *         name: app.example.com
   *         target: my-load-balancer.eu-west-1.elb.amazonaws.com
   *         ttl: 300
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { CustomResourceDefinition, CustomResourceInstance, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const dnsProvisioner = new CustomResourceDefinition({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'provisioners/cloudflare-dns.ts' }
   *     },
   *     environment: [{ name: 'CLOUDFLARE_API_TOKEN', value: $Secret('cloudflare-token') }],
   *     timeout: 120
   *   });
   *
   *   const appDnsRecord = new CustomResourceInstance({
   *     definitionName: 'dnsProvisioner',
   *     resourceProperties: {
   *       recordType: 'CNAME',
   *       name: 'app.example.com',
   *       target: 'my-load-balancer.eu-west-1.elb.amazonaws.com',
   *       ttl: 300
   *     }
   *   });
   *
   *   return { resources: { dnsProvisioner, appDnsRecord } };
   * });
   * ```
   */
  resourceProperties: { [name: string]: any };
}
interface CustomResourceDefinitionProps extends ResourceAccessProps {
  /**
   * #### How the Lambda function code is packaged and deployed.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   stripeWebhookProvisioner:
   *     type: custom-resource-definition
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: provisioners/stripe-webhook.ts
   *       environment:
   *         - name: STRIPE_SECRET_KEY
   *           value: $Secret('stripe-key')
   *       timeout: 30
   *   webhookEndpoint:
   *     type: custom-resource-instance
   *     properties:
   *       definitionName: stripeWebhookProvisioner
   *       resourceProperties:
   *         url: https://api.example.com/stripe/webhook
   *         events:
   *           - checkout.session.completed
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { CustomResourceDefinition, CustomResourceInstance, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const stripeWebhookProvisioner = new CustomResourceDefinition({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'provisioners/stripe-webhook.ts' }
   *     },
   *     environment: [{ name: 'STRIPE_SECRET_KEY', value: $Secret('stripe-key') }],
   *     timeout: 30
   *   });
   *
   *   const webhookEndpoint = new CustomResourceInstance({
   *     definitionName: 'stripeWebhookProvisioner',
   *     resourceProperties: {
   *       url: 'https://api.example.com/stripe/webhook',
   *       events: ['checkout.session.completed']
   *     }
   *   });
   *
   *   return { resources: { stripeWebhookProvisioner, webhookEndpoint } };
   * });
   * ```
   */
  packaging: LambdaPackaging;
  /**
   * #### Environment variables injected into the Lambda function. Use `$ResourceParam()` for dynamic values.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   assetsBucket:
   *     type: bucket
   *   cdnProvisioner:
   *     type: custom-resource-definition
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: provisioners/fastly-purge.ts
   *       environment:
   *         - name: FASTLY_API_TOKEN
   *           value: $Secret('fastly-token')
   *         - name: ORIGIN_BUCKET
   *           value: $ResourceParam('assetsBucket', 'name')
   *       timeout: 45
   *   cdnConfig:
   *     type: custom-resource-instance
   *     properties:
   *       definitionName: cdnProvisioner
   *       resourceProperties:
   *         serviceId: abc123
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import {
   *   Bucket,
   *   CustomResourceDefinition,
   *   CustomResourceInstance,
   *   $Secret,
   *   $ResourceParam,
   *   defineConfig
   * } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assetsBucket = new Bucket({});
   *
   *   const cdnProvisioner = new CustomResourceDefinition({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'provisioners/fastly-purge.ts' }
   *     },
   *     environment: [
   *       { name: 'FASTLY_API_TOKEN', value: $Secret('fastly-token') },
   *       { name: 'ORIGIN_BUCKET', value: $ResourceParam('assetsBucket', 'name') }
   *     ],
   *     timeout: 45
   *   });
   *
   *   const cdnConfig = new CustomResourceInstance({
   *     definitionName: 'cdnProvisioner',
   *     resourceProperties: { serviceId: 'abc123' }
   *   });
   *
   *   return { resources: { assetsBucket, cdnProvisioner, cdnConfig } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
  /**
   * #### Lambda runtime. Auto-detected from file extension if not specified.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   datadogMonitorProvisioner:
   *     type: custom-resource-definition
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: provisioners/datadog_monitor.py
   *       runtime: python3.12
   *       environment:
   *         - name: DD_API_KEY
   *           value: $Secret('datadog-api-key')
   *         - name: DD_APP_KEY
   *           value: $Secret('datadog-app-key')
   *       timeout: 60
   *   apiLatencyMonitor:
   *     type: custom-resource-instance
   *     properties:
   *       definitionName: datadogMonitorProvisioner
   *       resourceProperties:
   *         name: API p99 latency
   *         query: avg(last_5m):p99:trace.http.request{service:api} > 2
   *         thresholdSeconds: 2
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { CustomResourceDefinition, CustomResourceInstance, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const datadogMonitorProvisioner = new CustomResourceDefinition({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'provisioners/datadog_monitor.py' }
   *     },
   *     runtime: 'python3.12',
   *     environment: [
   *       { name: 'DD_API_KEY', value: $Secret('datadog-api-key') },
   *       { name: 'DD_APP_KEY', value: $Secret('datadog-app-key') }
   *     ],
   *     timeout: 60
   *   });
   *
   *   const apiLatencyMonitor = new CustomResourceInstance({
   *     definitionName: 'datadogMonitorProvisioner',
   *     resourceProperties: {
   *       name: 'API p99 latency',
   *       query: 'avg(last_5m):p99:trace.http.request{service:api} > 2',
   *       thresholdSeconds: 2
   *     }
   *   });
   *
   *   return { resources: { datadogMonitorProvisioner, apiLatencyMonitor } };
   * });
   * ```
   */
  runtime?: LambdaRuntime;
  /**
   * #### Max execution time in seconds. Max: 900.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   algoliaIndexProvisioner:
   *     type: custom-resource-definition
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: provisioners/algolia-index.ts
   *       environment:
   *         - name: ALGOLIA_APP_ID
   *           value: $Secret('algolia-app-id')
   *         - name: ALGOLIA_ADMIN_KEY
   *           value: $Secret('algolia-admin-key')
   *       timeout: 300
   *   productsIndex:
   *     type: custom-resource-instance
   *     properties:
   *       definitionName: algoliaIndexProvisioner
   *       resourceProperties:
   *         indexName: products
   *         searchableAttributes:
   *           - title
   *           - description
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { CustomResourceDefinition, CustomResourceInstance, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const algoliaIndexProvisioner = new CustomResourceDefinition({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'provisioners/algolia-index.ts' }
   *     },
   *     environment: [
   *       { name: 'ALGOLIA_APP_ID', value: $Secret('algolia-app-id') },
   *       { name: 'ALGOLIA_ADMIN_KEY', value: $Secret('algolia-admin-key') }
   *     ],
   *     timeout: 300
   *   });
   *
   *   const productsIndex = new CustomResourceInstance({
   *     definitionName: 'algoliaIndexProvisioner',
   *     resourceProperties: {
   *       indexName: 'products',
   *       searchableAttributes: ['title', 'description']
   *     }
   *   });
   *
   *   return { resources: { algoliaIndexProvisioner, productsIndex } };
   * });
   * ```
   *
   * @default 10
   */
  timeout?: number;
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   imageOptimizerProvisioner:
   *     type: custom-resource-definition
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: provisioners/optimize-images.ts
   *       timeout: 600
   *       memory: 2048
   *   bannerOptimization:
   *     type: custom-resource-instance
   *     properties:
   *       definitionName: imageOptimizerProvisioner
   *       resourceProperties:
   *         sourcePrefix: raw/banners/
   *         targetPrefix: optimized/banners/
   *         quality: 80
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { CustomResourceDefinition, CustomResourceInstance, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const imageOptimizerProvisioner = new CustomResourceDefinition({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'provisioners/optimize-images.ts' }
   *     },
   *     timeout: 600,
   *     memory: 2048
   *   });
   *
   *   const bannerOptimization = new CustomResourceInstance({
   *     definitionName: 'imageOptimizerProvisioner',
   *     resourceProperties: {
   *       sourcePrefix: 'raw/banners/',
   *       targetPrefix: 'optimized/banners/',
   *       quality: 80
   *     }
   *   });
   *
   *   return { resources: { imageOptimizerProvisioner, bannerOptimization } };
   * });
   * ```
   */
  memory?: number;
}
```

import type { AgentCoreBrowser, AgentCoreCodeInterpreter, AgentCoreGateway, AgentCoreMemory, AgentCoreRuntime } from './agentcore';
import type { ApplicationLoadBalancer } from './application-load-balancers';
import type { AppSyncApi } from './appsync-apis';
import type { AstroWeb } from './astro-web';
import type { AwsCdkConstruct } from './aws-cdk-construct';
import type { Bastion } from './bastion';
import type { BatchJob } from './batch-jobs';
import type { Bucket } from './buckets';
import type { Convex } from './convex';
import type { CustomResourceDefinition, CustomResourceInstance } from './custom-resources';
import type { ContainerWorkloadContainerPackaging } from './deployment-artifacts';
import type { DeploymentScript } from './deployment-script';
import type { DynamoDbTable } from './dynamo-db-tables';
import type { DsqlDatabase } from './dsql-databases';
import type { EmailSender } from './email-senders';
import type { EdgeLambdaFunction } from './edge-lambda-functions';
import type { EfsFilesystem } from './efs-filesystem';
import type { EventBus } from './event-buses';
import type { LambdaFunction } from './functions';
import type { HostingBucket } from './hosting-buckets';
import type { HttpApiGateway } from './http-api-gateways';
import type { WebSocketApiGateway } from './websocket-api-gateways';
import type { KinesisStream } from './kinesis-streams';
import type { KafkaCluster } from './kafka-clusters';
import type { MongoDbAtlasCluster } from './mongo-db-atlas-clusters';
import type { ContainerEfsMount, ContainerHealthCheck, ContainerWorkload, ContainerWorkloadContainerBase, ContainerWorkloadContainerLogging, ContainerWorkloadResourcesConfig, ContainerWorkloadScaling } from './multi-container-workloads';
import type { NetworkLoadBalancer } from './network-load-balancer';
import type { NextjsWeb } from './nextjs-web';
import type { NuxtWeb } from './nuxt-web';
import type { OpenSearchDomain } from './open-search';
import type { Arn } from './primitives';
import type { PrivateService } from './private-services';
import type { RedisCluster } from './redis-cluster';
import type { RelationalDatabase } from './relational-databases';
import type { RemixWeb } from './remix-web';
import type { SnsTopic } from './sns-topic';
import type { SolidStartWeb } from './solidstart-web';
import type { SqsQueue } from './sqs-queues';
import type { StateMachine } from './state-machines';
import type { SvelteKitWeb } from './sveltekit-web';
import type { SyntheticTest } from './synthetic-tests';
import type { TanStackWeb } from './tanstack-web';
import type { ResourceTracingConfig, TracingOptions } from './tracing';
import type { UpstashRedis } from './upstash-redis';
import type { UptimeCheck } from './uptime-checks';
import type { UserAuthPool } from './user-pools';
import type { WebAppFirewall } from './web-app-firewall';
import type { WebService } from './web-services';
import type { WorkerService } from './worker-services';
export type StacktapeResourceDefinition =
  | HostingBucket
  | NextjsWeb
  | AstroWeb
  | NuxtWeb
  | SvelteKitWeb
  | SolidStartWeb
  | TanStackWeb
  | RemixWeb
  | StacktapeWorkloadDefinition
  | RelationalDatabase
  | ApplicationLoadBalancer
  | AppSyncApi
  | NetworkLoadBalancer
  | HttpApiGateway
  | WebSocketApiGateway
  | Bucket
  | UserAuthPool
  | EventBus
  | Bastion
  | DynamoDbTable
  | DsqlDatabase
  | EmailSender
  | RedisCluster
  | StateMachine
  | MongoDbAtlasCluster
  | CustomResourceInstance
  | CustomResourceDefinition
  | UpstashRedis
  | UptimeCheck
  | SyntheticTest
  | DeploymentScript
  | AwsCdkConstruct
  | SqsQueue
  | SnsTopic
  | WebAppFirewall
  | OpenSearchDomain
  | EfsFilesystem
  | KinesisStream
  | KafkaCluster
  | Convex
  | AgentCoreRuntime
  | AgentCoreMemory
  | AgentCoreGateway
  | AgentCoreBrowser
  | AgentCoreCodeInterpreter;


/**
 * #### Dev Mode Configuration
 *
 * ---
 *
 * Controls whether this resource runs locally or connects to the deployed AWS version
 * during `stacktape dev`.
 */
export interface DevModeConfig {
  /**
   * #### Use the deployed AWS resource instead of a local emulation.
   *
   * ---
   *
   * By default, databases, Redis, and DynamoDB run locally in Docker during dev mode.
   * Set to `true` to connect to the real deployed resource instead (must be deployed first).
   *
   * Useful when local emulation doesn't match production behavior closely enough,
   * or when you need to work with real data.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   myApi:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       connectTo:
   *         - sessionsTable
   *   sessionsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: id
   *           type: string
   *       # stp-focus
   *       dev:
   *         remote: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, DynamoDbTable, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sessionsTable = new DynamoDbTable({
   *     primaryKey: { partitionKey: { name: 'id', type: 'string' } },
   *     // stp-focus
   *     dev: { remote: true }
   *     // stp-end-focus
   *   });
   *
   *   const myApi = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     connectTo: [sessionsTable]
   *   });
   *
   *   return { resources: { myApi, sessionsTable } };
   * });
   * ```
   *
   * @default false
   */
  remote?: boolean;
}


export interface DomainConfiguration {
  /**
   * #### Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).
   *
   * ---
   *
   * Don't include the protocol (`https://`). The domain must have a Route53 hosted zone
   * in your AWS account, with your registrar's nameservers pointing to it.
   *
   * Stacktape automatically creates a DNS record and provisions a free TLS certificate.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApi:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       customDomains:
   *         # stp-focus
   *         - domainName: api.example.com
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApi = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 },
   *     customDomains: [
   *       // stp-focus
   *       { domainName: 'api.example.com' }
   *       // stp-end-focus
   *     ]
   *   });
   *
   *   return { resources: { webApi } };
   * });
   * ```
   */
  domainName: string;
  /**
   * #### Use your own TLS certificate instead of the auto-generated one.
   *
   * ---
   *
   * Provide the ARN of an ACM certificate from your AWS account.
   * Only needed if you have specific certificate requirements (e.g., EV/OV certs).
   * By default, Stacktape provisions and renews free certificates automatically.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApi:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       customDomains:
   *         - domainName: api.example.com
   *           # stp-focus
   *           customCertificateArn: arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-ef56-7890-abcd-ef1234567890
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApi = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 },
   *     customDomains: [
   *       {
   *         domainName: 'api.example.com',
   *         // stp-focus
   *         customCertificateArn:
   *           'arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-ef56-7890-abcd-ef1234567890'
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webApi } };
   * });
   * ```
   */
  customCertificateArn?: string;
  /**
   * #### Skip DNS record creation for this domain.
   *
   * ---
   *
   * Set to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).
   * Stacktape will still provision the TLS certificate but won't touch your DNS.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApi:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       customDomains:
   *         - domainName: api.example.com
   *           # stp-focus
   *           disableDnsRecordCreation: true
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApi = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 },
   *     customDomains: [
   *       {
   *         domainName: 'api.example.com',
   *         // stp-focus
   *         disableDnsRecordCreation: true
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *
   *   return { resources: { webApi } };
   * });
   * ```
   *
   * @default false
   */
  disableDnsRecordCreation?: boolean;
}


export type StacktapeWorkloadDefinition =
  | LambdaFunction
  | ContainerWorkload
  | BatchJob
  | WebService
  | PrivateService
  | WorkerService
  | EdgeLambdaFunction;


/**
 * #### Escape hatch to modify the underlying CloudFormation resources Stacktape creates.
 *
 * ---
 *
 * Use dot-notation paths to override specific properties on any child resource.
 * Find resource logical IDs with `stacktape info:stack`.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDb:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('db-password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.2'
 *           primaryInstance:
 *             instanceSize: db.t3.micro
 *     # stp-focus
 *     overrides:
 *       MainDbDatabaseInstance:
 *         Properties.StorageEncrypted: true
 *     # stp-end-focus
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, RdsEnginePostgres, $Secret, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDb = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('db-password') },
 *     engine: new RdsEnginePostgres({
 *       version: '16.2',
 *       primaryInstance: { instanceSize: 'db.t3.micro' }
 *     }),
 *     // stp-focus
 *     overrides: {
 *       MainDbDatabaseInstance: { 'Properties.StorageEncrypted': true }
 *     }
 *     // stp-end-focus
 *   });
 *
 *   return { resources: { mainDb } };
 * });
 * ```
 */
export type ResourceOverrides = {
  [cfLogicalName: string]: { [resourcePath: string]: any };
};


export interface Hooks {
  /**
   * #### Scripts to run before deploying. Common use: build frontend, lint code.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   buildFrontend:
   *     type: local-script
   *     properties:
   *       executeCommand: npm run build
   * hooks:
   *   # stp-focus
   *   beforeDeploy:
   *     - scriptName: buildFrontend
   *   # stp-end-focus
   * resources:
   *   web:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const buildFrontend = new LocalScript({ executeCommand: 'npm run build' });
   *   const web = new HostingBucket({ uploadDirectoryPath: './dist' });
   *
   *   return {
   *     scripts: { buildFrontend },
   *     // stp-focus
   *     hooks: {
   *       beforeDeploy: [{ scriptName: 'buildFrontend' }]
   *     },
   *     // stp-end-focus
   *     resources: { web }
   *   };
   * });
   * ```
   */
  beforeDeploy?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run after deploying. Common use: run database migrations, seed data.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   runMigrations:
   *     type: local-script
   *     properties:
   *       executeCommand: npx prisma migrate deploy
   *       connectTo:
   *         - mainDb
   * hooks:
   *   # stp-focus
   *   afterDeploy:
   *     - scriptName: runMigrations
   *   # stp-end-focus
   * resources:
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, RdsEnginePostgres, LocalScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const runMigrations = new LocalScript({ executeCommand: 'npx prisma migrate deploy', connectTo: [mainDb] });
   *
   *   return {
   *     scripts: { runMigrations },
   *     // stp-focus
   *     hooks: {
   *       afterDeploy: [{ scriptName: 'runMigrations' }]
   *     },
   *     // stp-end-focus
   *     resources: { mainDb }
   *   };
   * });
   * ```
   */
  afterDeploy?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run before deleting the stack. Common use: export data, clean up external resources.
   *
   * ---
   *
   * Only runs when `--configPath` and `--stage` are provided to the delete command.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   exportData:
   *     type: local-script
   *     properties:
   *       executeCommand: node ./scripts/export-data.js
   *       connectTo:
   *         - mainDb
   * hooks:
   *   # stp-focus
   *   beforeDelete:
   *     - scriptName: exportData
   *   # stp-end-focus
   * resources:
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, RdsEnginePostgres, LocalScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const exportData = new LocalScript({ executeCommand: 'node ./scripts/export-data.js', connectTo: [mainDb] });
   *
   *   return {
   *     scripts: { exportData },
   *     // stp-focus
   *     hooks: {
   *       beforeDelete: [{ scriptName: 'exportData' }]
   *     },
   *     // stp-end-focus
   *     resources: { mainDb }
   *   };
   * });
   * ```
   */
  beforeDelete?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run after deleting the stack.
   *
   * ---
   *
   * Only runs when `--configPath` and `--stage` are provided to the delete command.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   notifyCleanup:
   *     type: local-script
   *     properties:
   *       executeCommand: node ./scripts/notify-slack.js
   * hooks:
   *   # stp-focus
   *   afterDelete:
   *     - scriptName: notifyCleanup
   *   # stp-end-focus
   * resources:
   *   worker:
   *     type: worker-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/worker.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WorkerService, StacktapeImageBuildpackPackaging, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const notifyCleanup = new LocalScript({ executeCommand: 'node ./scripts/notify-slack.js' });
   *   const worker = new WorkerService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/worker.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     scripts: { notifyCleanup },
   *     // stp-focus
   *     hooks: {
   *       afterDelete: [{ scriptName: 'notifyCleanup' }]
   *     },
   *     // stp-end-focus
   *     resources: { worker }
   *   };
   * });
   * ```
   */
  afterDelete?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run before syncing bucket contents.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   optimizeAssets:
   *     type: local-script
   *     properties:
   *       executeCommand: node ./scripts/optimize-images.js
   * hooks:
   *   # stp-focus
   *   beforeBucketSync:
   *     - scriptName: optimizeAssets
   *   # stp-end-focus
   * resources:
   *   assets:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./public
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const optimizeAssets = new LocalScript({ executeCommand: 'node ./scripts/optimize-images.js' });
   *   const assets = new HostingBucket({ uploadDirectoryPath: './public' });
   *
   *   return {
   *     scripts: { optimizeAssets },
   *     // stp-focus
   *     hooks: {
   *       beforeBucketSync: [{ scriptName: 'optimizeAssets' }]
   *     },
   *     // stp-end-focus
   *     resources: { assets }
   *   };
   * });
   * ```
   */
  beforeBucketSync?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run after syncing bucket contents.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   invalidateCache:
   *     type: local-script
   *     properties:
   *       executeCommand: node ./scripts/purge-cdn.js
   * hooks:
   *   # stp-focus
   *   afterBucketSync:
   *     - scriptName: invalidateCache
   *   # stp-end-focus
   * resources:
   *   assets:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./public
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const invalidateCache = new LocalScript({ executeCommand: 'node ./scripts/purge-cdn.js' });
   *   const assets = new HostingBucket({ uploadDirectoryPath: './public' });
   *
   *   return {
   *     scripts: { invalidateCache },
   *     // stp-focus
   *     hooks: {
   *       afterBucketSync: [{ scriptName: 'invalidateCache' }]
   *     },
   *     // stp-end-focus
   *     resources: { assets }
   *   };
   * });
   * ```
   */
  afterBucketSync?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run before starting dev mode.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   seedLocalDb:
   *     type: local-script
   *     properties:
   *       executeCommand: node ./scripts/seed.js
   * hooks:
   *   # stp-focus
   *   beforeDev:
   *     - scriptName: seedLocalDb
   *   # stp-end-focus
   * resources:
   *   cache:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: key
   *           type: string
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const seedLocalDb = new LocalScript({ executeCommand: 'node ./scripts/seed.js' });
   *   const cache = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'key', type: 'string' } } });
   *
   *   return {
   *     scripts: { seedLocalDb },
   *     // stp-focus
   *     hooks: {
   *       beforeDev: [{ scriptName: 'seedLocalDb' }]
   *     },
   *     // stp-end-focus
   *     resources: { cache }
   *   };
   * });
   * ```
   */
  beforeDev?: NamedScriptLifecycleHook[];
  /**
   * #### Scripts to run after dev mode exits.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   teardownLocal:
   *     type: local-script
   *     properties:
   *       executeCommand: docker compose down
   * hooks:
   *   # stp-focus
   *   afterDev:
   *     - scriptName: teardownLocal
   *   # stp-end-focus
   * resources:
   *   cache:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: key
   *           type: string
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const teardownLocal = new LocalScript({ executeCommand: 'docker compose down' });
   *   const cache = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'key', type: 'string' } } });
   *
   *   return {
   *     scripts: { teardownLocal },
   *     // stp-focus
   *     hooks: {
   *       afterDev: [{ scriptName: 'teardownLocal' }]
   *     },
   *     // stp-end-focus
   *     resources: { cache }
   *   };
   * });
   * ```
   */
  afterDev?: NamedScriptLifecycleHook[];
}


export interface LifecycleHookBase {
  /**
   * #### Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).
   *
   * ---
   *
   * Useful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   openBrowser:
   *     type: local-script
   *     properties:
   *       executeCommand: open http://localhost:3000
   * hooks:
   *   afterDeploy:
   *     # stp-focus
   *     - scriptName: openBrowser
   *       skipOnCI: true
   *     # stp-end-focus
   * resources:
   *   web:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const openBrowser = new LocalScript({ executeCommand: 'open http://localhost:3000' });
   *   const web = new HostingBucket({ uploadDirectoryPath: './dist' });
   *
   *   return {
   *     scripts: { openBrowser },
   *     hooks: {
   *       afterDeploy: [
   *         // stp-focus
   *         { scriptName: 'openBrowser', skipOnCI: true }
   *         // stp-end-focus
   *       ]
   *     },
   *     resources: { web }
   *   };
   * });
   * ```
   *
   * @default false
   */
  skipOnCI?: boolean;
  /**
   * #### Skip this hook when running locally; only run in CI/CD.
   *
   * ---
   *
   * Useful for CI-only tasks (e.g., uploading test reports, notifying Slack).
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   uploadTestReport:
   *     type: local-script
   *     properties:
   *       executeCommand: node ./scripts/upload-report.js
   * hooks:
   *   afterDeploy:
   *     # stp-focus
   *     - scriptName: uploadTestReport
   *       skipOnLocal: true
   *     # stp-end-focus
   * resources:
   *   web:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const uploadTestReport = new LocalScript({ executeCommand: 'node ./scripts/upload-report.js' });
   *   const web = new HostingBucket({ uploadDirectoryPath: './dist' });
   *
   *   return {
   *     scripts: { uploadTestReport },
   *     hooks: {
   *       afterDeploy: [
   *         // stp-focus
   *         { scriptName: 'uploadTestReport', skipOnLocal: true }
   *         // stp-end-focus
   *       ]
   *     },
   *     resources: { web }
   *   };
   * });
   * ```
   *
   * @default false
   */
  skipOnLocal?: boolean;
}


// interface InlineScriptLifecycleHook extends Script, LifecycleHookBase {}

export interface NamedScriptLifecycleHook extends LifecycleHookBase {
  /**
   * #### Script Name
   *
   * ---
   *
   * The name of the script to execute. The script must be defined in the `scripts` section of your configuration.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   migrate:
   *     type: local-script
   *     properties:
   *       executeCommand: npm run migrate
   *       connectTo:
   *         - db
   * hooks:
   *   afterDeploy:
   *     # stp-focus
   *     - scriptName: migrate
   *     # stp-end-focus
   * resources:
   *   db:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: mysql
   *         properties:
   *           version: '8.0.36'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, RdsEngineMysql, LocalScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const db = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: new RdsEngineMysql({ version: '8.0.36', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const migrate = new LocalScript({ executeCommand: 'npm run migrate', connectTo: [db] });
   *
   *   return {
   *     scripts: { migrate },
   *     hooks: {
   *       afterDeploy: [
   *         // stp-focus
   *         { scriptName: 'migrate' }
   *         // stp-end-focus
   *       ]
   *     },
   *     resources: { db }
   *   };
   * });
   * ```
   */
  scriptName: string;
}


/**
 * #### A local script with secure tunneling through a bastion host.
 *
 * ---
 *
 * This script type runs locally but tunnels connections to resources through a bastion server.
 * It provides a secure, encrypted connection to resources that are only accessible within the VPC,
 * such as private databases or Redis clusters.
 *
 * The environment variables injected by `connectTo` are automatically adjusted to use the tunneled endpoints.
 */
export interface LocalScriptWithBastionTunneling {
  type: 'local-script-with-bastion-tunneling';
  properties: LocalScriptWithBastionTunnelingProps;
}


export interface LocalScriptWithBastionTunnelingProps extends LocalScriptProps {
  /**
   * #### Bastion Resource Name
   *
   * ---
   *
   * The name of the bastion resource to use for tunneling to protected resources.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   migrateThroughTunnel:
   *     type: local-script-with-bastion-tunneling
   *     properties:
   *       # stp-focus
   *       bastionResource: jumpBox
   *       # stp-end-focus
   *       executeCommand: npx prisma migrate deploy
   *       connectTo:
   *         - privateDb
   * resources:
   *   jumpBox:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *   privateDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       accessibility:
   *         accessibilityMode: scoping-workloads-in-vpc
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, RelationalDatabase, RdsEnginePostgres, LocalScriptWithBastionTunneling, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const jumpBox = new Bastion({ instanceSize: 't3.micro' });
   *   const privateDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const migrateThroughTunnel = new LocalScriptWithBastionTunneling({
   *     // stp-focus
   *     bastionResource: 'jumpBox',
   *     // stp-end-focus
   *     executeCommand: 'npx prisma migrate deploy',
   *     connectTo: [privateDb]
   *   });
   *
   *   return { scripts: { migrateThroughTunnel }, resources: { jumpBox, privateDb } };
   * });
   * ```
   */
  bastionResource?: string;
}


/**
 * #### A script that runs remotely on a bastion server.
 *
 * ---
 *
 * Bastion scripts are executed on a bastion server within your VPC, not on your local machine.
 * Logs from the script's execution are streamed in real-time to your terminal.
 *
 * This is useful for running commands that need direct access to VPC resources
 * or for ensuring consistent execution environments across different machines.
 */
export interface BastionScript {
  type: 'bastion-script';
  properties: BastionScriptProps;
}


export interface BastionScriptProps extends ScriptEnvProps {
  /**
   * #### Bastion Resource Name
   *
   * ---
   *
   * The name of the bastion resource on which the commands will be executed.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   runOnBastion:
   *     type: bastion-script
   *     properties:
   *       # stp-focus
   *       bastionResource: jumpBox
   *       # stp-end-focus
   *       executeCommand: psql -h $STP_PRIVATE_DB_HOST -c 'SELECT 1'
   *       connectTo:
   *         - privateDb
   * resources:
   *   jumpBox:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *   privateDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       accessibility:
   *         accessibilityMode: scoping-workloads-in-vpc
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, RelationalDatabase, RdsEnginePostgres, BastionScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const jumpBox = new Bastion({ instanceSize: 't3.micro' });
   *   const privateDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const runOnBastion = new BastionScript({
   *     // stp-focus
   *     bastionResource: 'jumpBox',
   *     // stp-end-focus
   *     executeCommand: "psql -h $STP_PRIVATE_DB_HOST -c 'SELECT 1'",
   *     connectTo: [privateDb]
   *   });
   *
   *   return { scripts: { runOnBastion }, resources: { jumpBox, privateDb } };
   * });
   * ```
   */
  bastionResource?: string;
  /**
   * #### Execute Command
   *
   * ---
   *
   * A single terminal command to execute on the bastion host. Logs from the execution are streamed to your terminal.
   *
   * You can use either `executeCommand` or `executeCommands`, but not both.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   pingDb:
   *     type: bastion-script
   *     properties:
   *       bastionResource: jumpBox
   *       # stp-focus
   *       executeCommand: pg_isready -h $STP_PRIVATE_DB_HOST
   *       # stp-end-focus
   *       connectTo:
   *         - privateDb
   * resources:
   *   jumpBox:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *   privateDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       accessibility:
   *         accessibilityMode: scoping-workloads-in-vpc
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, RelationalDatabase, RdsEnginePostgres, BastionScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const jumpBox = new Bastion({ instanceSize: 't3.micro' });
   *   const privateDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const pingDb = new BastionScript({
   *     bastionResource: 'jumpBox',
   *     // stp-focus
   *     executeCommand: 'pg_isready -h $STP_PRIVATE_DB_HOST',
   *     // stp-end-focus
   *     connectTo: [privateDb]
   *   });
   *
   *   return { scripts: { pingDb }, resources: { jumpBox, privateDb } };
   * });
   * ```
   */
  executeCommand?: string;
  /**
   * #### Execute Commands
   *
   * ---
   *
   * A list of terminal commands to execute sequentially as a script on the bastion host. Logs from the execution are streamed to your terminal.
   *
   * You can use either `executeCommand` or `executeCommands`, but not both.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   dbMaintenance:
   *     type: bastion-script
   *     properties:
   *       bastionResource: jumpBox
   *       # stp-focus
   *       executeCommands:
   *         - psql -h $STP_PRIVATE_DB_HOST -c 'VACUUM ANALYZE;'
   *         - psql -h $STP_PRIVATE_DB_HOST -c 'REINDEX DATABASE postgres;'
   *       # stp-end-focus
   *       connectTo:
   *         - privateDb
   * resources:
   *   jumpBox:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *   privateDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       accessibility:
   *         accessibilityMode: scoping-workloads-in-vpc
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, RelationalDatabase, RdsEnginePostgres, BastionScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const jumpBox = new Bastion({ instanceSize: 't3.micro' });
   *   const privateDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const dbMaintenance = new BastionScript({
   *     bastionResource: 'jumpBox',
   *     // stp-focus
   *     executeCommands: [
   *       "psql -h $STP_PRIVATE_DB_HOST -c 'VACUUM ANALYZE;'",
   *       "psql -h $STP_PRIVATE_DB_HOST -c 'REINDEX DATABASE postgres;'"
   *     ],
   *     // stp-end-focus
   *     connectTo: [privateDb]
   *   });
   *
   *   return { scripts: { dbMaintenance }, resources: { jumpBox, privateDb } };
   * });
   * ```
   */
  executeCommands?: string[];
  /**
   * #### Working Directory
   *
   * ---
   *
   * The directory on the bastion host where the command will be executed.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   runScript:
   *     type: bastion-script
   *     properties:
   *       bastionResource: jumpBox
   *       executeCommand: ./maintenance.sh
   *       # stp-focus
   *       cwd: /opt/scripts
   *       # stp-end-focus
   * resources:
   *   jumpBox:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, BastionScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const jumpBox = new Bastion({ instanceSize: 't3.micro' });
   *   const runScript = new BastionScript({
   *     bastionResource: 'jumpBox',
   *     executeCommand: './maintenance.sh',
   *     // stp-focus
   *     cwd: '/opt/scripts'
   *     // stp-end-focus
   *   });
   *
   *   return { scripts: { runScript }, resources: { jumpBox } };
   * });
   * ```
   *
   * @default "/"
   */
  cwd?: string;
}


/**
 * #### A script that runs on your local machine.
 *
 * ---
 *
 * Local scripts are executed on the same machine where the Stacktape command is run.
 * They are useful for tasks like building your application, running database migrations, or other automation.
 *
 * The script must define one of the following: `executeCommand`, `executeScript`, `executeCommands`, or `executeScripts`.
 */
export interface LocalScript {
  type: 'local-script';
  properties: LocalScriptProps;
}


export interface LocalScriptProps extends ScriptEnvProps {
  /**
   * #### Execute Script
   *
   * ---
   *
   * The path to a script file to execute. The script can be written in JavaScript, TypeScript, or Python and runs in a separate process.
   *
   * The executable is determined by `defaults:configure` or the system default (`node` for JS/TS, `python` for Python). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   seed:
   *     type: local-script
   *     properties:
   *       # stp-focus
   *       executeScript: scripts/seed.ts
   *       # stp-end-focus
   *       connectTo:
   *         - db
   * resources:
   *   db:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: id
   *           type: string
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const db = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
   *   const seed = new LocalScript({
   *     // stp-focus
   *     executeScript: 'scripts/seed.ts',
   *     // stp-end-focus
   *     connectTo: [db]
   *   });
   *
   *   return { scripts: { seed }, resources: { db } };
   * });
   * ```
   */
  executeScript?: string;
  /**
   * #### Execute Command
   *
   * ---
   *
   * A single terminal command to execute in a separate shell process.
   *
   * The command runs on the machine executing the Stacktape command. Be aware of potential differences between local and CI environments (e.g., OS, shell). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   build:
   *     type: local-script
   *     properties:
   *       # stp-focus
   *       executeCommand: npm run build
   *       # stp-end-focus
   * resources:
   *   web:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const build = new LocalScript({
   *     // stp-focus
   *     executeCommand: 'npm run build'
   *     // stp-end-focus
   *   });
   *   const web = new HostingBucket({ uploadDirectoryPath: './dist' });
   *
   *   return { scripts: { build }, resources: { web } };
   * });
   * ```
   */
  executeCommand?: string;
  /**
   * #### Execute Scripts
   *
   * ---
   *
   * A list of script files to execute sequentially. Each script runs in a separate process.
   *
   * The script can be written in JavaScript, TypeScript, or Python. The executable is determined by `defaults:configure` or the system default. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   setup:
   *     type: local-script
   *     properties:
   *       # stp-focus
   *       executeScripts:
   *         - scripts/migrate.ts
   *         - scripts/seed.ts
   *       # stp-end-focus
   *       connectTo:
   *         - db
   * resources:
   *   db:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, RdsEnginePostgres, LocalScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const db = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const setup = new LocalScript({
   *     // stp-focus
   *     executeScripts: ['scripts/migrate.ts', 'scripts/seed.ts'],
   *     // stp-end-focus
   *     connectTo: [db]
   *   });
   *
   *   return { scripts: { setup }, resources: { db } };
   * });
   * ```
   */
  executeScripts?: string[];
  /**
   * #### Execute Commands
   *
   * ---
   *
   * A list of terminal commands to execute sequentially. Each command runs in a separate shell process.
   *
   * The commands run on the machine executing the Stacktape command. Be aware of potential differences between environments. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   buildAll:
   *     type: local-script
   *     properties:
   *       # stp-focus
   *       executeCommands:
   *         - npm ci
   *         - npm run lint
   *         - npm run build
   *       # stp-end-focus
   * resources:
   *   web:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const buildAll = new LocalScript({
   *     // stp-focus
   *     executeCommands: ['npm ci', 'npm run lint', 'npm run build']
   *     // stp-end-focus
   *   });
   *   const web = new HostingBucket({ uploadDirectoryPath: './dist' });
   *
   *   return { scripts: { buildAll }, resources: { web } };
   * });
   * ```
   */
  executeCommands?: string[];
  /**
   * #### Working Directory
   *
   * ---
   *
   * The directory where the script or command will be executed.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   buildFrontend:
   *     type: local-script
   *     properties:
   *       executeCommand: npm run build
   *       # stp-focus
   *       cwd: ./frontend
   *       # stp-end-focus
   * resources:
   *   web:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./frontend/dist
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const buildFrontend = new LocalScript({
   *     executeCommand: 'npm run build',
   *     // stp-focus
   *     cwd: './frontend'
   *     // stp-end-focus
   *   });
   *   const web = new HostingBucket({ uploadDirectoryPath: './frontend/dist' });
   *
   *   return { scripts: { buildFrontend }, resources: { web } };
   * });
   * ```
   *
   * @default The directory where the Stacktape command was executed.
   */
  cwd?: string;
  /**
   * #### Standard I/O Mode
   *
   * ---
   *
   * Controls how Stacktape connects the script process to the terminal.
   *
   * - `capture` streams stdout and stderr through Stacktape's progress UI and does not give the script terminal input.
   * - `inherit` temporarily hands the terminal to the script, including stdin. Use this for interactive programs.
   * - `ignore` suppresses all script standard I/O.
   *
   * `inherit` temporarily hides the dashboard and restores it after the script exits.
   *
   * @default capture
   */
  stdioMode?: 'capture' | 'inherit' | 'ignore';
  /**
   * #### Pipe Stdio
   *
   * ---
   *
   * If `true`, captures the script's stdout and stderr in Stacktape's progress output. If `false`, ignores them.
   * Use `stdioMode: inherit` for scripts that need interactive terminal input.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   silentTask:
   *     type: local-script
   *     properties:
   *       executeCommand: node ./scripts/background-task.js
   *       # stp-focus
   *       pipeStdio: false
   *       # stp-end-focus
   * resources:
   *   web:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: ./dist
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { HostingBucket, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const silentTask = new LocalScript({
   *     executeCommand: 'node ./scripts/background-task.js',
   *     // stp-focus
   *     pipeStdio: false
   *     // stp-end-focus
   *   });
   *   const web = new HostingBucket({ uploadDirectoryPath: './dist' });
   *
   *   return { scripts: { silentTask }, resources: { web } };
   * });
   * ```
   *
   * @default true
   * @deprecated Use `stdioMode`.
   */
  pipeStdio?: boolean;
}


export interface ScriptEnvProps {
  /**
   * #### Connect To
   *
   * ---
   *
   * A list of resources the script needs to interact with. Stacktape automatically injects environment variables with connection details for each specified resource.
   *
   * Environment variable names are in the format `STP_[RESOURCE_NAME]_[VARIABLE_NAME]` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`).
   *
   * **Injected Variables by Resource Type:**
   * - **`Bucket`**: `NAME`, `ARN`
   * - **`DynamoDbTable`**: `NAME`, `ARN`, `STREAM_ARN`
   * - **`MongoDbAtlasCluster`**: `CONNECTION_STRING`
   * - **`RelationalDatabase`**: `CONNECTION_STRING`, `JDBC_CONNECTION_STRING`, `HOST`, `PORT`. For Aurora clusters, `READER_CONNECTION_STRING`, `READER_JDBC_CONNECTION_STRING`, and `READER_HOST` are also included.
   * - **`RedisCluster`**: `HOST`, `READER_HOST`, `PORT`
   * - **`EventBus`**: `ARN`
   * - **`Function`**: `ARN`
   * - **`BatchJob`**: `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`
   * - **`UserAuthPool`**: `ID`, `CLIENT_ID`, `ARN`
   * - **`SnsTopic`**: `ARN`, `NAME`
   * - **`SqsQueue`**: `ARN`, `NAME`, `URL`
   * - **`UpstashKafkaTopic`**: `TOPIC_NAME`, `TOPIC_ID`, `USERNAME`, `PASSWORD`, `TCP_ENDPOINT`, `REST_URL`
   * - **`UpstashRedis`**: `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`
   * - **`PrivateService`**: `ADDRESS`
   * - **`WebService`**: `URL`
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   migrate:
   *     type: local-script
   *     properties:
   *       executeCommand: npx prisma migrate deploy
   *       # stp-focus
   *       connectTo:
   *         - mainDb
   *       # stp-end-focus
   * resources:
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, RdsEnginePostgres, LocalScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const migrate = new LocalScript({
   *     executeCommand: 'npx prisma migrate deploy',
   *     // stp-focus
   *     connectTo: [mainDb]
   *     // stp-end-focus
   *   });
   *
   *   return { scripts: { migrate }, resources: { mainDb } };
   * });
   * ```
   */
  connectTo?: string[];
  /**
   * #### Environment Variables
   *
   * ---
   *
   * A list of environment variables to pass to the script or command.
   *
   * Values can be:
   * - A static string, number, or boolean.
   * - The result of a [custom directive](https://docs.stacktape.com/configuration/directives/#custom-directives).
   * - A reference to another resource's parameter using the [`$ResourceParam` directive](https://docs.stacktape.com/configuration/referenceable-parameters/).
   * - A value from a [secret](https://docs.stacktape.com/resources/secrets/) using the [`$Secret` directive](https://docs.stacktape.com/configuration/directives/#secret).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   seed:
   *     type: local-script
   *     properties:
   *       executeScript: scripts/seed.ts
   *       # stp-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   *         - name: API_KEY
   *           value: $Secret('seed-api-key')
   *       # stp-end-focus
   * resources:
   *   table:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: id
   *           type: string
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, LocalScript, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const table = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
   *   const seed = new LocalScript({
   *     executeScript: 'scripts/seed.ts',
   *     // stp-focus
   *     environment: {
   *       NODE_ENV: 'production',
   *       API_KEY: $Secret('seed-api-key')
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return { scripts: { seed }, resources: { table } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
  /**
   * #### Assume Role of Resource
   *
   * ---
   *
   * The name of a deployed resource whose IAM role the script should assume. This grants the script the same permissions as the specified resource.
   *
   * The resource must be deployed before the script is executed. Stacktape injects temporary AWS credentials as environment variables, which are automatically used by most AWS SDKs and CLIs.
   *
   * **Supported Resource Types:**
   * - `function`
   * - `batch-job`
   * - `worker-service`
   * - `web-service`
   * - `private-service`
   * - `multi-container-workload`
   * - `nextjs-web`
   * - `astro-web`
   * - `nuxt-web`
   * - `sveltekit-web`
   * - `solidstart-web`
   * - `tanstack-web`
   * - `remix-web`
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   invokeAsApi:
   *     type: local-script
   *     properties:
   *       executeScript: scripts/admin-task.ts
   *       # stp-focus
   *       assumeRoleOfResource: api
   *       # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       connectTo:
   *         - dataBucket
   *   dataBucket:
   *     type: bucket
   *     properties: {}
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, Bucket, StacktapeImageBuildpackPackaging, LocalScript, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const dataBucket = new Bucket({});
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     connectTo: [dataBucket]
   *   });
   *   const invokeAsApi = new LocalScript({
   *     executeScript: 'scripts/admin-task.ts',
   *     // stp-focus
   *     assumeRoleOfResource: 'api'
   *     // stp-end-focus
   *   });
   *
   *   return { scripts: { invokeAsApi }, resources: { api, dataBucket } };
   * });
   * ```
   */
  assumeRoleOfResource?: string;
}


export interface DirectiveDefinition {
  /**
   * #### Directive Name
   *
   * ---
   *
   * The name of the custom directive.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * directives:
   *   # stp-focus
   *   - name: GetCommitSha
   *     filePath: directives/git.ts:getCommitSha
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       environment:
   *         - name: COMMIT_SHA
   *           value: $GetCommitSha()
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     environment: { COMMIT_SHA: '$GetCommitSha()' }
   *   });
   *
   *   return {
   *     // stp-focus
   *     directives: [{ name: 'GetCommitSha', filePath: 'directives/git.ts:getCommitSha' }],
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   */
  name: string;
  /**
   * #### File Path
   *
   * ---
   *
   * The path to the file where the directive is defined, in the format `{file-path}:{handler}`.
   *
   * If the `{handler}` is omitted:
   * - For `.js` and `.ts` files, the `default` export is used.
   * - For `.py` files, the `main` function is used.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * directives:
   *   - name: GetCommitSha
   *     # stp-focus
   *     filePath: directives/git.ts:getCommitSha
   *     # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       environment:
   *         - name: COMMIT_SHA
   *           value: $GetCommitSha()
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     environment: { COMMIT_SHA: '$GetCommitSha()' }
   *   });
   *
   *   return {
   *     directives: [
   *       {
   *         name: 'GetCommitSha',
   *         // stp-focus
   *         filePath: 'directives/git.ts:getCommitSha'
   *         // stp-end-focus
   *       }
   *     ],
   *     resources: { api }
   *   };
   * });
   * ```
   */
  filePath: string;
}


export interface DeploymentConfig {
  /**
   * #### Prevents accidental stack deletion. Must be disabled before you can delete.
   *
   * ---
   *
   * Recommended for production stacks. To delete a protected stack, first deploy with
   * `terminationProtection: false`, then run the delete command.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   # stp-focus
   *   terminationProtection: true
   *   # stp-end-focus
   * resources:
   *   prodDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       deletionProtection: true
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.r6g.large
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, RdsEnginePostgres, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const prodDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     deletionProtection: true,
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.r6g.large' } })
   *   });
   *
   *   return {
   *     // stp-focus
   *     deploymentConfig: { terminationProtection: true },
   *     // stp-end-focus
   *     resources: { prodDb }
   *   };
   * });
   * ```
   *
   * @default false
   */
  terminationProtection?: boolean;
  /**
   * #### IAM role for CloudFormation to assume during create/update/delete operations.
   *
   * ---
   *
   * Use this when your deploy user has limited permissions and CloudFormation needs
   * a more privileged role to manage resources. The role is persisted across deployments
   * and reused for delete/rollback even if removed from config later.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   # stp-focus
   *   cloudformationRoleArn: arn:aws:iam::123456789012:role/CloudFormationDeployRole
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     // stp-focus
   *     deploymentConfig: { cloudformationRoleArn: 'arn:aws:iam::123456789012:role/CloudFormationDeployRole' },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   */
  cloudformationRoleArn?: Arn;
  /**
   * #### Alarms that trigger automatic rollback if they fire during deployment.
   *
   * ---
   *
   * Specify alarm names (from `alarms` section) or ARNs. The alarm must already exist -
   * a newly created alarm only takes effect on the *next* deployment.
   *
   * Use with `monitoringTimeAfterDeploymentInMinutes` to keep watching after deploy completes.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   # stp-focus
   *   triggerRollbackOnAlarms:
   *     - arn:aws:cloudwatch:eu-west-1:123456789012:alarm:high-error-rate
   *   monitoringTimeAfterDeploymentInMinutes: 10
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *
   *   return {
   *     deploymentConfig: {
   *       // stp-focus
   *       triggerRollbackOnAlarms: ['arn:aws:cloudwatch:eu-west-1:123456789012:alarm:high-error-rate'],
   *       monitoringTimeAfterDeploymentInMinutes: 10
   *       // stp-end-focus
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  triggerRollbackOnAlarms?: string[];
  /**
   * #### How long (in minutes) to monitor rollback alarms after deployment completes.
   *
   * ---
   *
   * If an alarm fires during this window, the stack rolls back automatically.
   * Only useful when `triggerRollbackOnAlarms` is configured.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   triggerRollbackOnAlarms:
   *     - arn:aws:cloudwatch:eu-west-1:123456789012:alarm:high-error-rate
   *   # stp-focus
   *   monitoringTimeAfterDeploymentInMinutes: 15
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *
   *   return {
   *     deploymentConfig: {
   *       triggerRollbackOnAlarms: ['arn:aws:cloudwatch:eu-west-1:123456789012:alarm:high-error-rate'],
   *       // stp-focus
   *       monitoringTimeAfterDeploymentInMinutes: 15
   *       // stp-end-focus
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   *
   * @default 0
   */
  monitoringTimeAfterDeploymentInMinutes?: number;
  /**
   * #### Keep the stack in a failed state instead of rolling back on deployment failure.
   *
   * ---
   *
   * Useful for debugging: inspect what went wrong, then fix and redeploy
   * (or run `stacktape rollback` manually). By default, failed deployments
   * auto-rollback to the last working state.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   # stp-focus
   *   disableAutoRollback: true
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     // stp-focus
   *     deploymentConfig: { disableAutoRollback: true },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   *
   * @default false
   */
  disableAutoRollback?: boolean;
  /**
   * #### SNS topic ARNs to receive CloudFormation stack events during deployment.
   *
   * ---
   *
   * Useful for monitoring deployments in external systems (Slack, PagerDuty, etc.).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   # stp-focus
   *   publishEventsToArn:
   *     - arn:aws:sns:eu-west-1:123456789012:deployment-events
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     // stp-focus
   *     deploymentConfig: { publishEventsToArn: ['arn:aws:sns:eu-west-1:123456789012:deployment-events'] },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   */
  publishEventsToArn?: Arn[];
  /**
   * #### How many old deployment artifacts (Lambda bundles, container images) to keep.
   *
   * ---
   *
   * Older versions are cleaned up automatically. Lower values save storage costs,
   * higher values make it easier to roll back to previous versions.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   # stp-focus
   *   previousVersionsToKeep: 3
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     // stp-focus
   *     deploymentConfig: { previousVersionsToKeep: 3 },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   *
   * @default 10
   */
  previousVersionsToKeep?: number;
  /**
   * #### Disable faster uploads via S3 Transfer Acceleration.
   *
   * ---
   *
   * Transfer Acceleration routes uploads through the nearest AWS edge location
   * for faster deploys, especially from distant regions. Adds a small cost per GB.
   * Automatically disabled in regions where it's not available.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   # stp-focus
   *   disableS3TransferAcceleration: true
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     // stp-focus
   *     deploymentConfig: { disableS3TransferAcceleration: true },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   *
   * @default false
   */
  disableS3TransferAcceleration?: boolean;
}


export interface StackConfig {
  /**
   * #### Custom values to display and save after each deployment.
   *
   * ---
   *
   * Use outputs to surface dynamic values like API URLs, database endpoints, or resource ARNs
   * that are only known after deployment. Outputs are:
   * - Printed in the terminal after deploy
   * - Saved to the stack info JSON file
   * - Optionally exported for cross-stack references (via `export: true`)
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   # stp-focus
   *   outputs:
   *     - name: ApiUrl
   *       value: $ResourceParam('api', 'url')
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     stackConfig: {
   *       // stp-focus
   *       outputs: [{ name: 'ApiUrl', value: $ResourceParam('api', 'url') }]
   *       // stp-end-focus
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  outputs?: StackOutput[];
  /**
   * #### Tags applied to every AWS resource in this stack.
   *
   * ---
   *
   * Useful for cost tracking, access control, and organization. Stacktape automatically
   * adds `projectName`, `stage`, and `stackName` tags — your custom tags are merged on top.
   *
   * Max 45 tags.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   # stp-focus
   *   tags:
   *     - name: team
   *       value: payments
   *     - name: costCenter
   *       value: '4100'
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     stackConfig: {
   *       // stp-focus
   *       tags: [
   *         { name: 'team', value: 'payments' },
   *         { name: 'costCenter', value: '4100' }
   *       ]
   *       // stp-end-focus
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  tags?: CloudformationTag[];
  /**
   * #### Stop saving stack info to a local file after each deployment.
   *
   * ---
   *
   * By default, Stacktape saves resource details and custom outputs to
   * `.stacktape-stack-info/{stackName}.json` after every deploy.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   # stp-focus
   *   disableStackInfoSaving: true
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     // stp-focus
   *     stackConfig: { disableStackInfoSaving: true },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   *
   * @default false
   */
  disableStackInfoSaving?: boolean;
  /**
   * #### Directory for the stack info JSON file.
   *
   * ---
   *
   * Relative to the project root.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   # stp-focus
   *   stackInfoDirectory: ./build/stack-info
   *   # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     // stp-focus
   *     stackConfig: { stackInfoDirectory: './build/stack-info' },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   *
   * @default ".stacktape-stack-info/"
   */
  stackInfoDirectory?: string;
  /**
   * #### VPC configuration: reuse an existing VPC or configure NAT Gateways.
   */
  vpc?: VpcSettings;
  /**
   * #### Stack-wide distributed tracing default.
   *
   * ---
   *
   * Applies to every resource in the stack that supports tracing. Individual resources can override
   * it with their own `tracing` property (`false` opts a resource out). Enabling tracing requires no
   * code changes for Lambda-based resources — Stacktape attaches the OpenTelemetry instrumentation
   * automatically.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # stp-focus
   * stackConfig:
   *   tracing:
   *     enabled: true
   * # stp-end-focus
   * resources:
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } }
   *   });
   *   return {
   *     // stp-focus
   *     stackConfig: { tracing: { enabled: true } },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   */
  tracing?: TracingOptions;
  /**
   * Explicitly classifies this stack's stage as production or not.
   *
   * The classification drives everything that treats production differently: error-tracking
   * incidents (every production error group enters the incident queue), the stricter
   * delete-production permission, deploy gates, and AI remediation autonomy limits.
   *
   * When omitted, Stacktape infers it from the stage name: `prod`, `production`, `prd`, and `live`
   * (case-insensitive, including segmented variants like `prod-eu` or `client-a-prod`) count as
   * production, while names carrying a rehearsal marker (`pre-prod`, `prod-test`, `staging-live`)
   * do not. Set it explicitly when your naming does not follow those conventions.
   *
   * > This is a per-stage classification: with a TypeScript config, branch on the `stage` argument
   * > to return different values for different stages.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # stp-focus
   * stackConfig:
   *   stageType: production
   * # stp-end-focus
   * resources:
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/api.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(({ stage }) => {
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } }
   *   });
   *   return {
   *     // stp-focus
   *     stackConfig: { stageType: stage === 'live-eu' ? 'production' : 'non-production' },
   *     // stp-end-focus
   *     resources: { api }
   *   };
   * });
   * ```
   */
  stageType?: 'production' | 'non-production';
}


export interface VpcReuseConfig {
  /**
   * #### Project name of the stack whose VPC you want to share.
   *
   * ---
   *
   * Must be used together with `stage`. Cannot be combined with `vpcId`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   vpc:
   *     # stp-focus
   *     reuseVpc:
   *       projectName: shared-infra
   *       stage: production
   *     # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     stackConfig: {
   *       vpc: {
   *         // stp-focus
   *         reuseVpc: { projectName: 'shared-infra', stage: 'production' }
   *         // stp-end-focus
   *       }
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  projectName?: string;
  /**
   * #### Stage of the stack whose VPC you want to share.
   *
   * ---
   *
   * Must be used together with `projectName`. Cannot be combined with `vpcId`.
   */
  stage?: string;
  /**
   * #### Direct VPC ID to reuse (e.g., `vpc-1234567890abcdef0`).
   *
   * ---
   *
   * Use this to connect to a VPC not managed by Stacktape. Cannot be combined
   * with `projectName`/`stage`.
   *
   * The VPC must use a private CIDR range (10.x, 172.16-31.x, or 192.168.x)
   * and have at least 3 public subnets (subnets with a route to an Internet Gateway).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   vpc:
   *     reuseVpc:
   *       # stp-focus
   *       vpcId: vpc-1234567890abcdef0
   *       # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     stackConfig: {
   *       vpc: {
   *         reuseVpc: {
   *           // stp-focus
   *           vpcId: 'vpc-1234567890abcdef0'
   *           // stp-end-focus
   *         }
   *       }
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  vpcId?: string;
}


export interface NatSettings {
  /**
   * #### How many availability zones get a NAT Gateway (~$32/month each).
   *
   * ---
   *
   * - **1**: Cheapest, but no redundancy if that AZ goes down.
   * - **2**: Balanced cost and availability.
   * - **3**: Highest availability.
   *
   * Each NAT Gateway gets a static Elastic IP that persists across deployments —
   * useful for IP whitelisting with external services.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   # stp-focus
   *   vpc:
   *     nat:
   *       availabilityZones: 1
   *   # stp-end-focus
   * resources:
   *   worker:
   *     type: worker-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/worker.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       usePrivateSubnetsWithNAT: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WorkerService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const worker = new WorkerService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/worker.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     usePrivateSubnetsWithNAT: true
   *   });
   *
   *   return {
   *     // stp-focus
   *     stackConfig: { vpc: { nat: { availabilityZones: 1 } } },
   *     // stp-end-focus
   *     resources: { worker }
   *   };
   * });
   * ```
   *
   * @default 2
   */
  availabilityZones?: 1 | 2 | 3;
}


export interface VpcSettings {
  /**
   * #### Share a VPC with another Stacktape stack or use an existing VPC.
   *
   * ---
   *
   * Useful when this stack needs to access VPC-protected resources (databases, Redis)
   * from another stack. By default, each stack gets its own VPC.
   *
   * > **Important:** Set this when first creating the stack. Adding it to an already
   * > deployed stack can cause resources to be replaced and **data to be lost**.
   */
  reuseVpc?: VpcReuseConfig;

  /**
   * #### NAT Gateway configuration for private subnets.
   *
   * ---
   *
   * Only applies when you have workloads using `usePrivateSubnetsWithNAT: true`.
   * Controls how many availability zones get a NAT Gateway (affects cost and redundancy).
   */
  nat?: NatSettings;
}


// interface BudgetNotificationCondition {
//   /**
//    * #### Whether the notification applies to how much you have spent (**ACTUAL**) or to how much you are forecasted to spend (**FORECASTED**).
//    * ---
//    * - **FORECASTED** - A forecast is a prediction of how much you will use AWS services over the following month. This forecast is based on your past usage.
//    * - **ACTUAL** - An actual budget that you already spent in this month (as billed by AWS).
//    * @default ACTUAL
//    */
//   budgetType?: 'ACTUAL' | 'FORECASTED';
//   /**
//    * #### Percentage threshold. When this threshold is crossed, the notification is triggered.
//    * ---
//    * - Example:
//    *    - IF you set:
//    *      - `limit` to **200** dollars,
//    *      - `budgetType` to **ACTUAL**,
//    *      - `thresholdPercentage` to **80** percent,
//    *    - THEN the notification is triggered once your actual spend goes over 160 dollars (80% of 200).
//    * @default 100
//    */
//   thresholdPercentage?: number;
// }

export interface StackOutput {
  /**
   * #### Name of the output (used as the key in terminal and stack info file).
   */
  name: string;
  /**
   * #### Value to output. Typically a directive like `$ResourceParam('myApi', 'url')`.
   */
  value: string;
  /**
   * #### Human-readable description shown alongside the output.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   outputs:
   *     - name: ApiUrl
   *       value: $ResourceParam('api', 'url')
   *       # stp-focus
   *       description: Public HTTPS endpoint of the API service
   *       # stp-end-focus
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     stackConfig: {
   *       outputs: [
   *         {
   *           name: 'ApiUrl',
   *           value: $ResourceParam('api', 'url'),
   *           // stp-focus
   *           description: 'Public HTTPS endpoint of the API service'
   *           // stp-end-focus
   *         }
   *       ]
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  description?: string;
  /**
   * #### Make this output available to other CloudFormation stacks.
   *
   * ---
   *
   * Exported outputs can be referenced from other stacks using `$CfStackOutput()`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   outputs:
   *     - name: SharedBucketName
   *       value: $ResourceParam('assets', 'name')
   *       # stp-focus
   *       export: true
   *       # stp-end-focus
   * resources:
   *   assets:
   *     type: bucket
   *     properties: {}
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const assets = new Bucket({});
   *
   *   return {
   *     stackConfig: {
   *       outputs: [
   *         {
   *           name: 'SharedBucketName',
   *           value: $ResourceParam('assets', 'name'),
   *           // stp-focus
   *           export: true
   *           // stp-end-focus
   *         }
   *       ]
   *     },
   *     resources: { assets }
   *   };
   * });
   * ```
   *
   * @default false
   */
  export?: boolean;
}


// this is stacktape specification.
// We allow for only specifying Resource property and other values we will set with defaults.
export interface StpIamRoleStatement {
  /**
   * #### Optional identifier for this statement (for readability).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       iamRoleStatements:
   *         # stp-focus
   *         - Sid: AllowBedrockInvoke
   *           Effect: Allow
   *           Action:
   *             - bedrock:InvokeModel
   *           Resource:
   *             - 'arn:aws:bedrock:*::foundation-model/*'
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     iamRoleStatements: [
   *       // stp-focus
   *       {
   *         Sid: 'AllowBedrockInvoke',
   *         Effect: 'Allow',
   *         Action: ['bedrock:InvokeModel'],
   *         Resource: ['arn:aws:bedrock:*::foundation-model/*']
   *       }
   *       // stp-end-focus
   *     ]
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  Sid?: string;
  /**
   * #### Whether to allow or deny the specified actions.
   *
   * @default "Allow"
   */
  Effect?: string;
  /**
   * #### AWS actions to allow or deny (e.g., `s3:GetObject`, `sqs:SendMessage`).
   */
  Action?: string[];
  /**
   * #### Conditions under which this statement applies (e.g., IP restrictions, tag-based access).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       iamRoleStatements:
   *         - Effect: Allow
   *           Action:
   *             - s3:GetObject
   *           Resource:
   *             - 'arn:aws:s3:::my-secure-bucket/*'
   *           # stp-focus
   *           Condition:
   *             Bool:
   *               'aws:SecureTransport': 'true'
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     iamRoleStatements: [
   *       {
   *         Effect: 'Allow',
   *         Action: ['s3:GetObject'],
   *         Resource: ['arn:aws:s3:::my-secure-bucket/*'],
   *         // stp-focus
   *         Condition: { Bool: { 'aws:SecureTransport': 'true' } }
   *         // stp-end-focus
   *       }
   *     ]
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  Condition?: any;
  /**
   * #### ARNs of the AWS resources this statement applies to. Use `"*"` for all resources.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       # stp-focus
   *       iamRoleStatements:
   *         - Resource:
   *             - '*'
   *           Action:
   *             - rekognition:DetectLabels
   *             - rekognition:DetectText
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     // stp-focus
   *     iamRoleStatements: [
   *       {
   *         Resource: ['*'],
   *         Action: ['rekognition:DetectLabels', 'rekognition:DetectText']
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  Resource: string[];
}


export interface EnvironmentVar {
  /**
   * #### Environment variable name (e.g., `DATABASE_URL`, `API_KEY`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       # stp-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   *         - name: MAX_CONNECTIONS
   *           value: 50
   *         - name: STRIPE_KEY
   *           value: $Secret('stripe.secret-key')
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     // stp-focus
   *     environment: {
   *       NODE_ENV: 'production',
   *       MAX_CONNECTIONS: 50,
   *       STRIPE_KEY: $Secret('stripe.secret-key')
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  name: string;
  /**
   * #### Environment variable value. Numbers and booleans are converted to strings.
   */
  value: string | boolean | number;
}


export interface SecretEnvironmentVar {
  /**
   * #### Environment variable name exposed to the container (e.g., `DATABASE_PASSWORD`, `API_KEY`).
   */
  name: string;
  /**
   * #### Secret source injected by the container runtime.
   *
   * Use an exact `$SsmParam(...)` or `$Secret(...)` directive. Unlike `environment`, Stacktape passes only the
   * parameter or secret ARN to the container orchestrator; the sensitive value is never stored in the task
   * definition.
   */
  valueFrom: string;
}


export interface CloudformationTag {
  /**
   * #### Tag name (1-128 characters).
   */
  name: string;
  /**
   * #### Tag value (1-256 characters).
   */
  value: string;
}


export interface ResourceAccessProps {
  /**
   * #### Give this resource access to other resources in your stack.
   *
   * ---
   *
   * List the names of resources this workload needs to communicate with. Stacktape automatically:
   * - **Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
   * - **Opens network access** (security group rules for databases, Redis)
   * - **Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`
   *
   * Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
   * resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.
   *
   * ---
   *
   * #### What each resource type provides:
   *
   * **`Bucket`** — read/write/delete objects → `NAME`, `ARN`
   *
   * **`DynamoDbTable`** — CRUD + scan/query → `NAME`, `ARN`, `STREAM_ARN`
   *
   * **`RelationalDatabase`** — network access + connection details → `CONNECTION_STRING`, `HOST`, `PORT`.
   * Aurora also gets `READER_CONNECTION_STRING`, `READER_HOST`.
   *
   * **`MongoDbAtlasCluster`** — temporary credential-less access → `CONNECTION_STRING`
   *
   * **`RedisCluster`** — network access → `HOST`, `READER_HOST`, `PORT`
   *
   * **`Function`** — invoke permission → `ARN`
   *
   * **`BatchJob`** — submit/list/terminate → `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`
   *
   * **`EventBus`** — publish events → `ARN`
   *
   * **`UserAuthPool`** — full control → `ID`, `CLIENT_ID`, `ARN`
   *
   * **`SqsQueue`** — send/receive/delete → `ARN`, `NAME`, `URL`
   *
   * **`SnsTopic`** — publish/subscribe → `ARN`, `NAME`
   *
   * **`UpstashRedis`** → `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`
   *
   * **`PrivateService`** → `ADDRESS`
   *
   * **`EmailSender`** — scoped SES sending permission → `IDENTITY`, `IDENTITY_ARN`, `REGION`, `CONFIGURATION_SET_NAME`
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       # stp-focus
   *       connectTo:
   *         - mainDb
   *         - uploads
   *       # stp-end-focus
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *   uploads:
   *     type: bucket
   *     properties: {}
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, RelationalDatabase, Bucket, RdsEnginePostgres, StacktapeImageBuildpackPackaging, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const uploads = new Bucket({});
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 },
   *     // stp-focus
   *     connectTo: [mainDb, uploads]
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api, mainDb, uploads } };
   * });
   * ```
   */
  connectTo?: string[];
  /**
   * #### Raw IAM policy statements for permissions not covered by `connectTo`.
   *
   * ---
   *
   * Added as a separate policy alongside auto-generated permissions. Use this for
   * accessing AWS services directly (e.g., Rekognition, Textract, Bedrock).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   processor:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/job.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *       # stp-focus
   *       iamRoleStatements:
   *         - Effect: Allow
   *           Action:
   *             - textract:AnalyzeDocument
   *           Resource:
   *             - '*'
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const processor = new BatchJob({
   *     container: { packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/job.ts' }) },
   *     resources: { cpu: 1, memory: 2048 },
   *     // stp-focus
   *     iamRoleStatements: [
   *       {
   *         Effect: 'Allow',
   *         Action: ['textract:AnalyzeDocument'],
   *         Resource: ['*']
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { processor } };
   * });
   * ```
   */
  iamRoleStatements?: StpIamRoleStatement[];
}


export interface SimpleServiceContainer extends ResourceAccessProps {
  /**
   * #### Configures the container image for the service.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       # stp-focus
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       # stp-end-focus
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     // stp-focus
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     // stp-end-focus
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  packaging: ContainerWorkloadContainerPackaging;
  /**
   * #### Environment variables injected into the container at runtime.
   *
   * ---
   *
   * Use for configuration like API keys, feature flags, or secrets.
   * Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       # stp-focus
   *       environment:
   *         - name: LOG_LEVEL
   *           value: info
   *         - name: DATABASE_URL
   *           value: $ResourceParam('mainDb', 'connectionString')
   *       # stp-end-focus
   *       connectTo:
   *         - mainDb
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, RelationalDatabase, RdsEnginePostgres, StacktapeImageBuildpackPackaging, $ResourceParam, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
   *   });
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     // stp-focus
   *     environment: {
   *       LOG_LEVEL: 'info',
   *       DATABASE_URL: $ResourceParam('mainDb', 'connectionString')
   *     },
   *     // stp-end-focus
   *     connectTo: [mainDb]
   *   });
   *
   *   return { resources: { api, mainDb } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
  /**
   * #### Sensitive environment variables fetched by the container runtime.
   *
   * Values must be exact `$SsmParam(...)` or `$Secret(...)` directives. Prefer a SecureString SSM parameter for
   * secrets that do not need automatic rotation; use Secrets Manager when rotation or its other lifecycle features
   * are useful.
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * secrets: {
   *   DATABASE_PASSWORD: $SsmParam('/my-app/production/database-password'),
   *   ROTATING_API_KEY: $Secret('rotating-api-key')
   * }
   * ```
   */
  secrets?: SecretEnvironmentVar[];
  /**
   * #### Logging configuration.
   *
   * ---
   *
   * Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
   * View logs with `stacktape logs` or in the Stacktape Console.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       # stp-focus
   *       logging:
   *         retentionDays: 30
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     // stp-focus
   *     logging: { retentionDays: 30 }
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  logging?: ContainerWorkloadContainerLogging;
  /**
   * #### CPU, memory, and compute engine for the container.
   *
   * ---
   *
   * Two compute engines:
   * - **Fargate** (default): Serverless — just specify `cpu` and `memory`.
   * - **EC2**: Specify `instanceTypes` for more control and potentially lower cost.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       # stp-focus
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *         architecture: arm64
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     // stp-focus
   *     resources: { cpu: 1, memory: 2048, architecture: 'arm64' }
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  resources: ContainerWorkloadResourcesConfig;
  /**
   * #### Auto-scaling: add/remove container instances based on demand.
   *
   * ---
   *
   * Traffic is automatically distributed across all running containers.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       # stp-focus
   *       scaling:
   *         minInstances: 2
   *         maxInstances: 10
   *         scalingPolicy:
   *           keepAvgCpuUtilizationUnder: 70
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 },
   *     // stp-focus
   *     scaling: {
   *       minInstances: 2,
   *       maxInstances: 10,
   *       scalingPolicy: { keepAvgCpuUtilizationUnder: 70 }
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  scaling?: ContainerWorkloadScaling;
  /**
   * #### Health check that auto-replaces unhealthy containers.
   *
   * ---
   *
   * If a container fails the health check, it's terminated and replaced automatically.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       # stp-focus
   *       internalHealthCheck:
   *         healthCheckCommand:
   *           - CMD-SHELL
   *           - curl -f http://localhost:3000/health || exit 1
   *         intervalSeconds: 30
   *         retries: 3
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     // stp-focus
   *     internalHealthCheck: {
   *       healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
   *       intervalSeconds: 30,
   *       retries: 3
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  internalHealthCheck?: ContainerHealthCheck;
  /**
   * #### Seconds to wait for graceful shutdown before force-killing the container.
   *
   * ---
   *
   * The container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       # stp-focus
   *       stopTimeout: 30
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     // stp-focus
   *     stopTimeout: 30
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   *
   * @default 2
   */
  stopTimeout?: number;
  /**
   * #### Allow SSH-like access to running containers for debugging.
   *
   * ---
   *
   * Enables `stacktape container:session` to open an interactive shell inside the container.
   * Adds a small SSM agent that uses minimal CPU/memory.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       # stp-focus
   *       enableRemoteSessions: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     // stp-focus
   *     enableRemoteSessions: true
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   *
   * @default false
   */
  enableRemoteSessions?: boolean;
  /**
   * #### Persistent EFS volumes shared across containers and restarts.
   *
   * ---
   *
   * Data stored in EFS volumes persists even when containers are replaced.
   * Multiple containers can mount the same volume. All data is encrypted in transit.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       # stp-focus
   *       volumeMounts:
   *         - type: efs
   *           properties:
   *             efsFilesystemName: sharedData
   *             mountPath: /data
   *       # stp-end-focus
   *   sharedData:
   *     type: efs-filesystem
   *     properties: {}
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, EfsFilesystem, ContainerEfsMount, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sharedData = new EfsFilesystem({});
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 },
   *     // stp-focus
   *     volumeMounts: [
   *       new ContainerEfsMount({ efsFilesystemName: 'sharedData', mountPath: '/data' })
   *     ]
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api, sharedData } };
   * });
   * ```
   */
  volumeMounts?: ContainerEfsMount[];
  /**
   * #### Helper containers that run alongside the main container.
   *
   * ---
   *
   * - **`run-on-init`**: Runs to completion before the main container starts (e.g., database migrations).
   * - **`always-running`**: Runs for the entire lifecycle (e.g., log forwarders, monitoring agents).
   *   Can reach the main container via `localhost`.
   */
  sideContainers?: ServiceHelperContainer[];
  /**
   * #### Deploy in private subnets with a static outbound IP via NAT Gateway.
   *
   * ---
   *
   * The container won't have a public IP. All outbound traffic routes through a NAT Gateway,
   * giving you a static IP you can whitelist in external services (APIs, payment gateways, etc.).
   *
   * Configure the number of NAT Gateways in `stackConfig.vpc.nat`.
   *
   * **Adds cost:** NAT Gateway ~$32/month + data processing fees.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.25
   *         memory: 512
   *       # stp-focus
   *       usePrivateSubnetsWithNAT: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.25, memory: 512 },
   *     // stp-focus
   *     usePrivateSubnetsWithNAT: true
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   *
   * @default false
   */
  usePrivateSubnetsWithNAT?: boolean;
  /**
   * #### Distributed tracing for this service.
   *
   * ---
   *
   * Overrides the stack-wide `stackConfig.tracing` setting: `false` opts this service out, `true`
   * opts it in with the stack-wide sampling, an object opts it in with its own settings.
   *
   * When enabled, Stacktape runs an OpenTelemetry collector as a sidecar container and points the
   * service's OpenTelemetry SDK at it (`http://localhost:4318`) through standard `OTEL_*`
   * environment variables. The service needs the OpenTelemetry SDK in the application (any
   * language) — spans it emits are picked up without further configuration.
   *
   * Traces are stored in your AWS account via X-Ray Transaction Search; see `stackConfig.tracing`
   * for the account-level effects.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   tracing:
   *     enabled: true
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       # stp-focus
   *       tracing:
   *         samplingRate: 0.5
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/server.ts' } },
   *     resources: { cpu: 0.5, memory: 1024 },
   *     // stp-focus
   *     tracing: { samplingRate: 0.5 }
   *     // stp-end-focus
   *   });
   *   return { stackConfig: { tracing: { enabled: true } }, resources: { api } };
   * });
   * ```
   */
  tracing?: ResourceTracingConfig;
}


export interface ServiceHelperContainer extends ContainerWorkloadContainerBase {
  /**
   * #### When and how this sidecar container runs.
   *
   * ---
   *
   * - **`run-on-init`**: Must exit with code 0 before the main container starts. Use for migrations or setup.
   * - **`always-running`**: Runs alongside the main container for its entire lifetime. If it crashes, the whole task fails.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   api:
   *     type: web-service
   *     properties:
   *       packaging:
   *         type: stacktape-image-buildpack
   *         properties:
   *           entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       # stp-focus
   *       sideContainers:
   *         - name: migrations
   *           containerType: run-on-init
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/migrate.ts
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *     resources: { cpu: 0.5, memory: 1024 },
   *     // stp-focus
   *     sideContainers: [
   *       {
   *         name: 'migrations',
   *         containerType: 'run-on-init',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/migrate.ts' })
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { api } };
   * });
   * ```
   */
  containerType: 'run-on-init' | 'always-running';
}

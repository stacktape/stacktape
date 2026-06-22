# Stacktape Config

Resource type: `stacktape-config`

## TypeScript Definition

```typescript
interface StacktapeConfig {
  /**
   * #### The name of this service.
   *
   * ---
   *
   * > **Deprecated:** Use the `--projectName` option in the CLI instead.
   *
   * The CloudFormation stack name will be in the format: `{serviceName}-{stage}`.
   *
   * Must be alphanumeric and can contain dashes. Must match the regex `[a-zA-Z][-a-zA-Z0-9]*`.
   *
   * @deprecated
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * serviceName: my-web-app
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
   * import { WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/server.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     serviceName: 'my-web-app',
   *     resources: { api }
   *   };
   * });
   * ```
   */
  serviceName?: string;
  /**
   * #### Credentials and settings for 3rd-party services (MongoDB Atlas, Upstash).
   *
   * ---
   *
   * Required only if you use `mongo-db-atlas-cluster` or `upstash-redis` resources in your stack.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   mongoDbAtlas:
   *     organizationId: 5f1e9b2c4a7d3e0011223344
   *     publicKey: abcdefgh
   *     privateKey: $Secret('mongo-atlas.private-key')
   *     accessibility:
   *       accessibilityMode: scoping-workloads-in-vpc
   *       whitelistedIps:
   *         - 203.0.113.7/32
   * resources:
   *   database:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new MongoDbAtlasCluster({ clusterTier: 'M10' });
   *
   *   return {
   *     providerConfig: {
   *       mongoDbAtlas: {
   *         organizationId: '5f1e9b2c4a7d3e0011223344',
   *         publicKey: 'abcdefgh',
   *         privateKey: $Secret('mongo-atlas.private-key'),
   *         accessibility: {
   *           accessibilityMode: 'scoping-workloads-in-vpc',
   *           whitelistedIps: ['203.0.113.7/32']
   *         }
   *       }
   *     },
   *     resources: { database }
   *   };
   * });
   * ```
   */
  providerConfig?: {
    mongoDbAtlas?: MongoDbAtlasProvider;
    upstash?: UpstashProvider;
  };
  /**
   * #### Reusable values you can reference anywhere in the config with `$Var().variableName`.
   *
   * ---
   *
   * Useful for avoiding repetition. For example, define a shared environment name
   * and reference it in multiple resources.
   *
   * ```yaml
   * variables:
   *   appPort: 3000
   * # Then use: $Var().appPort
   * resources: {}
   * ```
   *
   * **Example (YAML):**
   *
   * ```yaml
   * variables:
   *   appPort: 3000
   *   logLevel: info
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
   *         - name: PORT
   *           value: $Var('appPort')
   *         - name: LOG_LEVEL
   *           value: $Var('logLevel')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appPort = 3000;
   *   const logLevel = 'info';
   *
   *   const api = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/server.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     environment: {
   *       PORT: appPort,
   *       LOG_LEVEL: logLevel
   *     }
   *   });
   *
   *   return {
   *     variables: {
   *       appPort,
   *       logLevel
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  variables?: { [variableName: string]: any };
  /**
   * #### Run scripts automatically before/after deploy, delete, or dev commands.
   *
   * ---
   *
   * Each hook references a script defined in the `scripts` section.
   * Common uses: run database migrations after deploy, build frontend before deploy,
   * clean up resources after delete.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * hooks:
   *   afterDeploy:
   *     - scriptName: migrateDatabase
   *   beforeDeploy:
   *     - scriptName: buildFrontend
   *       skipOnCI: true
   * scripts:
   *   migrateDatabase:
   *     type: local-script
   *     properties:
   *       executeCommand: npx prisma migrate deploy
   *       connectTo:
   *         - mainDb
   *   buildFrontend:
   *     type: local-script
   *     properties:
   *       executeCommand: npm run build
   * resources:
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       credentials:
   *         masterUserPassword: $Secret('db.password')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDb = new RelationalDatabase({
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     credentials: { masterUserPassword: $Secret('db.password') }
   *   });
   *
   *   return {
   *     hooks: {
   *       afterDeploy: [{ scriptName: 'migrateDatabase' }],
   *       beforeDeploy: [{ scriptName: 'buildFrontend', skipOnCI: true }]
   *     },
   *     scripts: {
   *       migrateDatabase: {
   *         type: 'local-script',
   *         properties: { executeCommand: 'npx prisma migrate deploy', connectTo: ['mainDb'] }
   *       },
   *       buildFrontend: {
   *         type: 'local-script',
   *         properties: { executeCommand: 'npm run build' }
   *       }
   *     },
   *     resources: { mainDb }
   *   };
   * });
   * ```
   */
  hooks?: Hooks;
  /**
   * #### Custom shell commands or code you can run manually or as lifecycle hooks.
   *
   * ---
   *
   * Use `connectTo` in a script to auto-inject database URLs, API keys, etc. as environment variables.
   * Run scripts with `stacktape script:run --scriptName myScript` or attach them to `hooks`.
   *
   * **Script types:**
   * - **`local-script`**: Runs on your machine (or CI). Good for migrations, builds, seed scripts.
   * - **`local-script-with-bastion-tunneling`**: Runs locally but tunnels connections to VPC-only
   *   resources (e.g., private databases) through a bastion host.
   * - **`bastion-script`**: Runs remotely on the bastion host inside your VPC.
   *
   * Scripts can be shell commands or JS/TS/Python files.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * scripts:
   *   seedDatabase:
   *     type: local-script
   *     properties:
   *       executeScript: scripts/seed.ts
   *       connectTo:
   *         - mainDb
   *   runMaintenance:
   *     type: bastion-script
   *     properties:
   *       bastionResource: bastion
   *       executeCommand: psql -c 'VACUUM ANALYZE;'
   * resources:
   *   bastion:
   *     type: bastion
   *     properties: {}
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *       credentials:
   *         masterUserPassword: $Secret('db.password')
   *       accessibility:
   *         accessibilityMode: vpc
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const bastion = new Bastion({});
   *   const mainDb = new RelationalDatabase({
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.2',
   *         primaryInstance: { instanceSize: 'db.t4g.micro' }
   *       }
   *     },
   *     credentials: { masterUserPassword: $Secret('db.password') },
   *     accessibility: { accessibilityMode: 'vpc' }
   *   });
   *
   *   return {
   *     scripts: {
   *       seedDatabase: {
   *         type: 'local-script',
   *         properties: { executeScript: 'scripts/seed.ts', connectTo: ['mainDb'] }
   *       },
   *       runMaintenance: {
   *         type: 'bastion-script',
   *         properties: { bastionResource: 'bastion', executeCommand: "psql -c 'VACUUM ANALYZE;'" }
   *       }
   *     },
   *     resources: { bastion, mainDb }
   *   };
   * });
   * ```
   */
  scripts?: { [scriptName: string]: LocalScript | BastionScript | LocalScriptWithBastionTunneling };
  /**
   * #### Register custom functions that dynamically compute config values at deploy time.
   *
   * ---
   *
   * Define a directive by pointing to a JS/TS/Python file, then use it anywhere in the config
   * like a built-in directive (`$MyDirective()`). Useful for fetching external data,
   * computing dynamic values, or conditional logic.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * directives:
   *   - name: getApiKey
   *     filePath: directives/secrets.ts:getApiKey
   *   - name: computeStageDomain
   *     filePath: directives/domain.ts
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
   *       environment:
   *         - name: API_KEY
   *           value: $GetApiKey()
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WorkerService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const worker = new WorkerService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/worker.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 },
   *     environment: { API_KEY: '$GetApiKey()' }
   *   });
   *
   *   return {
   *     directives: [
   *       { name: 'getApiKey', filePath: 'directives/secrets.ts:getApiKey' },
   *       { name: 'computeStageDomain', filePath: 'directives/domain.ts' }
   *     ],
   *     resources: { worker }
   *   };
   * });
   * ```
   */
  directives?: DirectiveDefinition[];
  /**
   * #### Advanced deployment settings: rollback behavior, termination protection, artifact retention.
   *
   * ---
   *
   * Most projects don't need to change these. Useful for production stacks where you want
   * extra safety (termination protection, rollback alarms) or cost control (artifact cleanup).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * deploymentConfig:
   *   terminationProtection: true
   *   disableAutoRollback: false
   *   previousVersionsToKeep: 5
   *   triggerRollbackOnAlarms:
   *     - arn:aws:cloudwatch:eu-west-1:123456789012:alarm:api-high-error-rate
   *   monitoringTimeAfterDeploymentInMinutes: 10
   *   disableS3TransferAcceleration: false
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
   * import { WebService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/server.ts' }
   *     },
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *
   *   return {
   *     deploymentConfig: {
   *       terminationProtection: true,
   *       disableAutoRollback: false,
   *       previousVersionsToKeep: 5,
   *       triggerRollbackOnAlarms: ['arn:aws:cloudwatch:eu-west-1:123456789012:alarm:api-high-error-rate'],
   *       monitoringTimeAfterDeploymentInMinutes: 10,
   *       disableS3TransferAcceleration: false
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  deploymentConfig?: DeploymentConfig;
  /**
   * #### Stack-wide settings: custom outputs, tags, VPC configuration, and stack info saving.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * stackConfig:
   *   tags:
   *     - name: team
   *       value: backend
   *     - name: costCenter
   *       value: '4711'
   *   outputs:
   *     - name: apiUrl
   *       value: $ResourceParam('api', 'url')
   *       description: Public URL of the web service
   *   stackInfoDirectory: .stacktape-stack-info/
   *   disableStackInfoSaving: false
   *   vpc:
   *     nat:
   *       availabilityZones: 2
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
   * import { WebService, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const api = new WebService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/server.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     stackConfig: {
   *       tags: [
   *         { name: 'team', value: 'backend' },
   *         { name: 'costCenter', value: '4711' }
   *       ],
   *       outputs: [
   *         { name: 'apiUrl', value: $ResourceParam('api', 'url'), description: 'Public URL of the web service' }
   *       ],
   *       stackInfoDirectory: '.stacktape-stack-info/',
   *       disableStackInfoSaving: false,
   *       vpc: { nat: { availabilityZones: 2 } }
   *     },
   *     resources: { api }
   *   };
   * });
   * ```
   */
  stackConfig?: StackConfig;
  /**
   * #### Your app's infrastructure: APIs, databases, containers, functions, buckets, and more.
   *
   * ---
   *
   * Each entry is a named resource (e.g., `myApi`, `myDatabase`). Stacktape creates and manages
   * the underlying AWS resources for you. Use `stacktape stack-info --detailed` to inspect them.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   notificationSender:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/send-notification.ts
   *       events:
   *         - type: http-api-gateway
   *           properties:
   *             httpApiGatewayName: mainGateway
   *             method: POST
   *             path: /notify
   *   mainGateway:
   *     type: http-api-gateway
   *     properties: {}
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainGateway = new HttpApiGateway({});
   *   const notificationSender = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/send-notification.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'http-api-gateway',
   *         properties: { httpApiGatewayName: 'mainGateway', method: 'POST', path: '/notify' }
   *       }
   *     ]
   *   });
   *
   *   return {
   *     resources: { notificationSender, mainGateway }
   *   };
   * });
   * ```
   */
  resources: { [resourceName: string]: StacktapeResourceDefinition };
  /**
   * #### Escape hatch: add raw AWS CloudFormation resources alongside Stacktape-managed ones.
   *
   * ---
   *
   * For advanced use cases where Stacktape doesn't have a built-in resource type.
   * These are merged into the CloudFormation template as-is. Use `stacktape stack-info --detailed`
   * to check existing logical names and avoid conflicts.
   *
   * Does not count towards your resource limit.
   *
   * **Example (YAML):**
   *
   * ```yaml
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
   * cloudformationResources:
   *   MyRawSnsTopic:
   *     Type: AWS::SNS::Topic
   *     Properties:
   *       TopicName: legacy-events
   *       DisplayName: Legacy Events Topic
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WorkerService, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const worker = new WorkerService({
   *     packaging: {
   *       type: 'stacktape-image-buildpack',
   *       properties: { entryfilePath: 'src/worker.ts' }
   *     },
   *     resources: { cpu: 0.25, memory: 512 }
   *   });
   *
   *   return {
   *     resources: { worker },
   *     cloudformationResources: {
   *       MyRawSnsTopic: {
   *         Type: 'AWS::SNS::Topic',
   *         Properties: {
   *           TopicName: 'legacy-events',
   *           DisplayName: 'Legacy Events Topic'
   *         }
   *       }
   *     }
   *   };
   * });
   * ```
   */
  cloudformationResources?: { [resourceName: string]: CloudformationResource };
}
```

/**
 * #### Run a script during deploy or delete — database migrations, seed data, cleanup tasks.
 *
 * ---
 *
 * Executes as a Lambda function. Use `after:deploy` to run migrations after resources are ready,
 * or `before:delete` for cleanup. Can also be triggered manually with `stacktape deployment-script:run`.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   # stp-focus
 *   runMigrations:
 *     type: deployment-script
 *     properties:
 *       trigger: after:deploy
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./scripts/migrate.ts
 *       connectTo:
 *         - mainDatabase
 *       joinDefaultVpc: true
 *       timeout: 120
 *       memory: 512
 *   # stp-end-focus
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('db-password')
 *       engine:
 *         type: postgres
 *         properties:
 *           primaryInstance:
 *             instanceSize: db.t4g.micro
 *           version: '16.2'
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('db-password') },
 *     engine: new RdsEnginePostgres({
 *       primaryInstance: { instanceSize: 'db.t4g.micro' },
 *       version: '16.2'
 *     })
 *   });
 *
 *   // stp-focus
 *   const runMigrations = new DeploymentScript({
 *     trigger: 'after:deploy',
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/migrate.ts' }),
 *     connectTo: ['mainDatabase'],
 *     joinDefaultVpc: true,
 *     timeout: 120,
 *     memory: 512
 *   });
 *   // stp-end-focus
 *
 *   return { resources: { mainDatabase, runMigrations } };
 * });
 * ```
 */
interface DeploymentScript {
  type: 'deployment-script';
  properties: DeploymentScriptProps;
  overrides?: ResourceOverrides;
}

type StpDeploymentScript = DeploymentScript['properties'] & {
  name: string;
  type: DeploymentScript['type'];
  configParentResourceType: DeploymentScript['type'];
  nameChain: string[];
  _nestedResources: {
    scriptFunction: StpLambdaFunction;
  };
};

interface DeploymentScriptProps extends ResourceAccessProps {
  /**
   * #### When to run: `after:deploy` (fails → rollback) or `before:delete` (fails → deletion continues).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cleanup:
   *     type: deployment-script
   *     properties:
   *       # stp-focus
   *       trigger: before:delete
   *       # stp-end-focus
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/cleanup.ts
   *       timeout: 300
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cleanup = new DeploymentScript({
   *     // stp-focus
   *     trigger: 'before:delete',
   *     // stp-end-focus
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/cleanup.ts' }),
   *     timeout: 300
   *   });
   *
   *   return { resources: { cleanup } };
   * });
   * ```
   */
  trigger: 'after:deploy' | 'before:delete';
  /**
   * #### How the script code is packaged. Use `stacktape-lambda-buildpack` for auto-bundling.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   seedData:
   *     type: deployment-script
   *     properties:
   *       trigger: after:deploy
   *       # stp-focus
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/seed.ts
   *       # stp-end-focus
   *       timeout: 120
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const seedData = new DeploymentScript({
   *     trigger: 'after:deploy',
   *     // stp-focus
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/seed.ts' }),
   *     // stp-end-focus
   *     timeout: 120
   *   });
   *
   *   return { resources: { seedData } };
   * });
   * ```
   */
  packaging: LambdaPackaging;
  /**
   * #### Lambda runtime. Auto-detected from file extension if not specified.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   runMigrations:
   *     type: deployment-script
   *     properties:
   *       trigger: after:deploy
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/migrate.ts
   *       # stp-focus
   *       runtime: nodejs22.x
   *       # stp-end-focus
   *       timeout: 120
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const runMigrations = new DeploymentScript({
   *     trigger: 'after:deploy',
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/migrate.ts' }),
   *     // stp-focus
   *     runtime: 'nodejs22.x',
   *     // stp-end-focus
   *     timeout: 120
   *   });
   *
   *   return { resources: { runMigrations } };
   * });
   * ```
   */
  runtime?: LambdaRuntime;
  /**
   * #### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   seedData:
   *     type: deployment-script
   *     properties:
   *       trigger: after:deploy
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/seed.ts
   *       # stp-focus
   *       environment:
   *         - name: STAGE
   *           value: $Stage()
   *         - name: ADMIN_API_KEY
   *           value: $Secret('admin-api-key')
   *       # stp-end-focus
   *       timeout: 120
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging, $Stage, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const seedData = new DeploymentScript({
   *     trigger: 'after:deploy',
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/seed.ts' }),
   *     // stp-focus
   *     environment: [
   *       { name: 'STAGE', value: $Stage() },
   *       { name: 'ADMIN_API_KEY', value: $Secret('admin-api-key') }
   *     ],
   *     // stp-end-focus
   *     timeout: 120
   *   });
   *
   *   return { resources: { seedData } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
  /**
   * #### Structured data passed to the handler function as the event payload. Not for secrets — use `environment`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   seedData:
   *     type: deployment-script
   *     properties:
   *       trigger: after:deploy
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/seed.ts
   *       # stp-focus
   *       parameters:
   *         seedCount: 100
   *         truncateFirst: true
   *         adminEmail: admin@example.com
   *       # stp-end-focus
   *       timeout: 120
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const seedData = new DeploymentScript({
   *     trigger: 'after:deploy',
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/seed.ts' }),
   *     // stp-focus
   *     parameters: {
   *       seedCount: 100,
   *       truncateFirst: true,
   *       adminEmail: 'admin@example.com'
   *     },
   *     // stp-end-focus
   *     timeout: 120
   *   });
   *
   *   return { resources: { seedData } };
   * });
   * ```
   */
  parameters?: { [name: string]: any };
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   runMigrations:
   *     type: deployment-script
   *     properties:
   *       trigger: after:deploy
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/migrate.ts
   *       # stp-focus
   *       memory: 1024
   *       # stp-end-focus
   *       timeout: 120
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const runMigrations = new DeploymentScript({
   *     trigger: 'after:deploy',
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/migrate.ts' }),
   *     // stp-focus
   *     memory: 1024,
   *     // stp-end-focus
   *     timeout: 120
   *   });
   *
   *   return { resources: { runMigrations } };
   * });
   * ```
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 900 (15 minutes).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   longSeed:
   *     type: deployment-script
   *     properties:
   *       trigger: after:deploy
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/seed.ts
   *       # stp-focus
   *       timeout: 900
   *       # stp-end-focus
   *       memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const longSeed = new DeploymentScript({
   *     trigger: 'after:deploy',
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/seed.ts' }),
   *     // stp-focus
   *     timeout: 900,
   *     // stp-end-focus
   *     memory: 1024
   *   });
   *
   *   return { resources: { longSeed } };
   * });
   * ```
   *
   * @default 10
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   runMigrations:
   *     type: deployment-script
   *     properties:
   *       trigger: after:deploy
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/migrate.ts
   *       connectTo:
   *         - mainDatabase
   *       # stp-focus
   *       joinDefaultVpc: true
   *       # stp-end-focus
   *       timeout: 120
   *   mainDatabase:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *           version: '16.2'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDatabase = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: new RdsEnginePostgres({
   *       primaryInstance: { instanceSize: 'db.t4g.micro' },
   *       version: '16.2'
   *     })
   *   });
   *
   *   const runMigrations = new DeploymentScript({
   *     trigger: 'after:deploy',
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/migrate.ts' }),
   *     connectTo: ['mainDatabase'],
   *     // stp-focus
   *     joinDefaultVpc: true,
   *     // stp-end-focus
   *     timeout: 120
   *   });
   *
   *   return { resources: { mainDatabase, runMigrations } };
   * });
   * ```
   */
  joinDefaultVpc?: boolean;
  /**
   * #### Ephemeral `/tmp` storage in MB (512–10,240).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   exportData:
   *     type: deployment-script
   *     properties:
   *       trigger: before:delete
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./scripts/export.ts
   *       # stp-focus
   *       storage: 2048
   *       # stp-end-focus
   *       timeout: 600
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const exportData = new DeploymentScript({
   *     trigger: 'before:delete',
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/export.ts' }),
   *     // stp-focus
   *     storage: 2048,
   *     // stp-end-focus
   *     timeout: 600
   *   });
   *
   *   return { resources: { exportData } };
   * });
   * ```
   *
   * @default 512
   */
  storage?: number;
}

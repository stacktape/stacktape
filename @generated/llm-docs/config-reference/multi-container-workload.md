# Container Workload

Resource type: `multi-container-workload`

## TypeScript Definition

```typescript
/**
 * #### Run multiple containers together as a single unit with shared compute resources.
 *
 * ---
 *
 * For advanced setups: sidecars, init containers, or services that need multiple processes.
 * Supports Fargate (serverless) or EC2 (custom instances). Auto-scales horizontally.
 */
interface ContainerWorkload {
  type: 'multi-container-workload';
  properties: ContainerWorkloadProps;
  overrides?: ResourceOverrides;
}

interface ContainerWorkloadProps extends ResourceAccessProps {
  /**
   * #### Containers in this workload. They share compute resources and scale together.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   */
  containers: ContainerWorkloadContainer[];
  /**
   * #### CPU, memory, and compute engine (Fargate or EC2).
   *
   * ---
   *
   * - **Fargate** (set `cpu` + `memory`): Serverless, no servers to manage.
   * - **EC2** (set `instanceTypes`): Choose specific instance types for more control or GPU access.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 1
   *         memory: 2048
   *         architecture: arm64
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: { cpu: 1, memory: 2048, architecture: 'arm64' }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  resources: ContainerWorkloadResourcesConfig;
  /**
   * period of time scheduler should ignore unhealthy load balancer health checks after a task has first started.
   * This is only used when your multi-container-workload is configured to use a load balancer. This grace period can prevent the service scheduler from marking workload instances as unhealthy and stopping them before they have time to come up.
   */
  // loadBalancerCheckGracePeriodSeconds?: number;
  /**
   * #### Auto-scaling: how many instances and when to add/remove them.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       scaling:
   *         minInstances: 2
   *         maxInstances: 10
   *         scalingPolicy:
   *           keepAvgCpuUtilizationUnder: 70
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     scaling: {
   *       minInstances: 2,
   *       maxInstances: 10,
   *       scalingPolicy: { keepAvgCpuUtilizationUnder: 70 }
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  scaling?: ContainerWorkloadScaling;
  /**
   * #### Gradual traffic shifting (canary/linear) for safe deployments. Requires an ALB integration.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       deployment:
   *         strategy: Canary10Percent5Minutes
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     deployment: { strategy: 'Canary10Percent5Minutes' }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   */
  deployment?: ContainerWorkloadDeploymentConfig;
  /**
   * #### Enable `stacktape container:session` for interactive shell access to running containers.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       enableRemoteSessions: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     enableRemoteSessions: true
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  enableRemoteSessions?: boolean;
  /**
   * #### Run in private subnets with a NAT Gateway for outbound internet. Gives you a static public IP.
   *
   * ---
   *
   * Useful for IP whitelisting with third-party APIs. NAT Gateway costs ~$32/month per AZ + data processing fees.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: worker
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/worker.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       usePrivateSubnetsWithNAT: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'worker', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/worker.ts' }) }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     usePrivateSubnetsWithNAT: true
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default false
   */
  usePrivateSubnetsWithNAT?: boolean;
}

interface ContainerWorkloadDeploymentConfig {
  /**
   * #### How traffic shifts to the new version during deployment.
   *
   * ---
   *
   * - `Canary10Percent5Minutes`: 10% first, then all after 5 min.
   * - `Canary10Percent15Minutes`: 10% first, then all after 15 min.
   * - `Linear10PercentEvery1Minutes`: 10% more every minute.
   * - `Linear10PercentEvery3Minutes`: 10% more every 3 minutes.
   * - `AllAtOnce`: Instant switch.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       deployment:
   *         strategy: Linear10PercentEvery3Minutes
   *   appLb:
   *     type: application-load-balancer
   *   smokeTest:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/smoke-test.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, LambdaFunction, StacktapeImageBuildpackPackaging, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const smokeTest = new LambdaFunction({ packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/smoke-test.ts' }) });
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     deployment: {
   *       strategy: 'Linear10PercentEvery3Minutes'
   *     }
   *   });
   *   return { resources: { app, appLb, smokeTest } };
   * });
   * ```
   */
  strategy:
    | 'Canary10Percent5Minutes'
    | 'Canary10Percent15Minutes'
    | 'Linear10PercentEvery1Minutes'
    | 'Linear10PercentEvery3Minutes'
    | 'AllAtOnce';
  /**
   * #### Lambda function to run before traffic shifts to the new version (for validation/smoke tests).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       deployment:
   *         strategy: Canary10Percent5Minutes
   *         beforeAllowTrafficFunction: smokeTest
   *   appLb:
   *     type: application-load-balancer
   *   smokeTest:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/smoke-test.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, LambdaFunction, StacktapeImageBuildpackPackaging, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const smokeTest = new LambdaFunction({ packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/smoke-test.ts' }) });
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     deployment: {
   *       strategy: 'Canary10Percent5Minutes',
   *       beforeAllowTrafficFunction: 'smokeTest'
   *     }
   *   });
   *   return { resources: { app, appLb, smokeTest } };
   * });
   * ```
   */
  beforeAllowTrafficFunction?: string;
  /**
   * #### Lambda function to run after all traffic has shifted (for post-deployment checks).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       deployment:
   *         strategy: Canary10Percent5Minutes
   *         afterTrafficShiftFunction: smokeTest
   *   appLb:
   *     type: application-load-balancer
   *   smokeTest:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/smoke-test.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, LambdaFunction, StacktapeImageBuildpackPackaging, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const smokeTest = new LambdaFunction({ packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/smoke-test.ts' }) });
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     deployment: {
   *       strategy: 'Canary10Percent5Minutes',
   *       afterTrafficShiftFunction: 'smokeTest'
   *     }
   *   });
   *   return { resources: { app, appLb, smokeTest } };
   * });
   * ```
   */
  afterTrafficShiftFunction?: string;
  /**
   * #### ALB listener port for test traffic. Only needed with `beforeAllowTrafficFunction` and custom listeners.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       deployment:
   *         strategy: Canary10Percent5Minutes
   *         beforeAllowTrafficFunction: smokeTest
   *         testListenerPort: 8443
   *   appLb:
   *     type: application-load-balancer
   *   smokeTest:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/smoke-test.ts
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, LambdaFunction, StacktapeImageBuildpackPackaging, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const smokeTest = new LambdaFunction({ packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/smoke-test.ts' }) });
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     deployment: {
   *       strategy: 'Canary10Percent5Minutes',
   *       beforeAllowTrafficFunction: 'smokeTest',
   *       testListenerPort: 8443
   *     }
   *   });
   *   return { resources: { app, appLb, smokeTest } };
   * });
   * ```
   */
  testListenerPort?: number;
}

interface ContainerWorkloadResourcesConfig {
  /**
   * #### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 2
   *         memory: 4096
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: {
   *       cpu: 2,
   *       memory: 4096
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  cpu?: 0.25 | 0.5 | 1 | 2 | 4 | 8 | 16;
  /**
   * #### Memory in MB. Must be compatible with the vCPU count on Fargate.
   *
   * ---
   *
   * Fargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,
   * 4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.
   * For EC2: auto-detected from instance type if omitted.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 1
   *         memory: 4096
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: {
   *       cpu: 1,
   *       memory: 4096
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  memory?: number;
  /**
   * #### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.
   *
   * ---
   *
   * First type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.
   * Tip: specify a single type and omit `cpu`/`memory` for optimal sizing.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         instanceTypes:
   *           - c6g.large
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: {
   *       instanceTypes: ['c6g.large']
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  instanceTypes?: string[];
  /**
   * #### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         instanceTypes:
   *           - t3.medium
   *         enableWarmPool: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: {
   *       instanceTypes: ['t3.medium'],
   *       enableWarmPool: true
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  enableWarmPool?: boolean;
  /**
   * #### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *         architecture: arm64
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: {
   *       cpu: 0.5,
   *       memory: 1024,
   *       architecture: 'arm64'
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 'x86_64'
   */
  architecture?: 'x86_64' | 'arm64';
}

interface ContainerWorkloadScaling {
  /**
   * #### Minimum running instances. Set to 0 is not supported — minimum is 1.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       scaling:
   *         minInstances: 2
   *         maxInstances: 8
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     scaling: {
   *       minInstances: 2,
   *       maxInstances: 8
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 1
   */
  minInstances?: number;
  /**
   * #### Maximum running instances. Traffic is distributed across all instances.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       scaling:
   *         minInstances: 2
   *         maxInstances: 8
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     scaling: {
   *       minInstances: 2,
   *       maxInstances: 8
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 1
   */
  maxInstances?: number;
  /**
   * #### When to scale: CPU and/or memory utilization targets.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       scaling:
   *         minInstances: 2
   *         maxInstances: 8
   *         scalingPolicy:
   *           keepAvgCpuUtilizationUnder: 60
   *           keepAvgMemoryUtilizationUnder: 75
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     scaling: {
   *       minInstances: 2,
   *       maxInstances: 8,
   *       scalingPolicy: { keepAvgCpuUtilizationUnder: 60, keepAvgMemoryUtilizationUnder: 75 }
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  scalingPolicy?: ContainerWorkloadScalingPolicy;
}

interface ContainerWorkloadScalingPolicy {
  /**
   * #### Scale out when avg CPU exceeds this %, scale in when it drops below.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       scaling:
   *         minInstances: 2
   *         maxInstances: 8
   *         scalingPolicy:
   *           keepAvgCpuUtilizationUnder: 65
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     scaling: {
   *       minInstances: 2,
   *       maxInstances: 8,
   *       scalingPolicy: {
   *         keepAvgCpuUtilizationUnder: 65
   *       }
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 80
   */
  keepAvgCpuUtilizationUnder?: number;
  /**
   * #### Scale out when avg memory exceeds this %, scale in when it drops below.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       scaling:
   *         minInstances: 2
   *         maxInstances: 8
   *         scalingPolicy:
   *           keepAvgMemoryUtilizationUnder: 70
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     scaling: {
   *       minInstances: 2,
   *       maxInstances: 8,
   *       scalingPolicy: {
   *         keepAvgMemoryUtilizationUnder: 70
   *       }
   *     }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 80
   */
  keepAvgMemoryUtilizationUnder?: number;
}

interface ContainerWorkloadContainerLogging extends LogForwardingBase {
  /**
   * #### Disable logging to CloudWatch.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           logging:
   *             disabled: true
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         logging: { disabled: true }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           logging:
   *             retentionDays: 30
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         logging: { retentionDays: 30 }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

interface ContainerWorkloadContainerBase {
  /**
   * #### Unique container name within this workload.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' })
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  name: string;
  /**
   * #### How to build or specify the container image.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: custom-dockerfile
   *             properties:
   *               buildContextPath: ./api
   *               dockerfilePath: Dockerfile
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, CustomDockerfilePackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new CustomDockerfilePackaging({ buildContextPath: './api', dockerfilePath: 'Dockerfile' })
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  packaging: ContainerWorkloadContainerPackaging;
  /**
   * #### If `true` (default), the entire workload restarts when this container fails.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *         - name: metrics-sidecar
   *           packaging:
   *             type: prebuilt-image
   *             properties:
   *               image: prom/statsd-exporter:latest
   *           essential: false
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, PrebuiltImagePackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) },
   *       {
   *         name: 'metrics-sidecar',
   *         packaging: new PrebuiltImagePackaging({ image: 'prom/statsd-exporter:latest' }),
   *         essential: false
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  essential?: boolean;
  /**
   * #### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           logging:
   *             retentionDays: 14
   *             disabled: false
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         logging: { retentionDays: 14, disabled: false }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  logging?: ContainerWorkloadContainerLogging;
  /**
   * #### Start this container only after the listed containers reach a specific state.
   *
   * ---
   *
   * E.g., wait for a database sidecar to be `HEALTHY` before starting the app container.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: migrations
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/migrate.ts
   *           essential: false
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           dependsOn:
   *             - containerName: migrations
   *               condition: SUCCESS
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       { name: 'migrations', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/migrate.ts' }), essential: false },
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         dependsOn: [{ containerName: 'migrations', condition: 'SUCCESS' }]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  dependsOn?: ContainerDependency[];
  /**
   * #### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           environment:
   *             - name: NODE_ENV
   *               value: production
   *             - name: DATABASE_URL
   *               value: $ResourceParam('appDb', 'connectionString')
   *             - name: STRIPE_KEY
   *               value: $Secret('stripe.secretKey')
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *       connectTo:
   *         - appDb
   *   appDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db.password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.6'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, RelationalDatabase, StacktapeImageBuildpackPackaging, $ResourceParam, $Secret, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db.password') },
   *     engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t3.micro' } } }
   *   });
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         environment: {
   *           NODE_ENV: 'production',
   *           DATABASE_URL: $ResourceParam('appDb', 'connectionString'),
   *           STRIPE_KEY: $Secret('stripe.secretKey')
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 },
   *     connectTo: [appDb]
   *   });
   *   return { resources: { app, appDb } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
  /**
   * #### Command-based health check. If it fails on an essential container, the workload instance is replaced.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           internalHealthCheck:
   *             healthCheckCommand:
   *               - CMD-SHELL
   *               - curl -f http://localhost:3000/health || exit 1
   *             intervalSeconds: 30
   *             retries: 3
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         internalHealthCheck: {
   *           healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
   *           intervalSeconds: 30,
   *           retries: 3
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  internalHealthCheck?: ContainerHealthCheck;
  /**
   * #### Seconds to wait after SIGTERM before SIGKILL (2-120).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           stopTimeout: 30
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         stopTimeout: 30
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 2
   */
  stopTimeout?: number;
  /**
   * #### Mount EFS volumes for persistent, shared storage across containers.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: sharedStorage
   *                 mountPath: /data
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   sharedStorage:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, EfsFilesystem, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sharedStorage = new EfsFilesystem({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         volumeMounts: [
   *           { type: 'efs', properties: { efsFilesystemName: 'sharedStorage', mountPath: '/data' } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, sharedStorage } };
   * });
   * ```
   */
  volumeMounts?: ContainerEfsMount[];
}

interface ContainerWorkloadContainer extends ContainerWorkloadContainerBase {
  /**
   * #### How this container receives traffic (API Gateway, load balancer, or service-connect).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 paths:
   *                   - /*
   *                 containerPort: 3000
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           {
   *             type: 'application-load-balancer',
   *             properties: { loadBalancerName: 'appLb', priority: 1, paths: ['/*'], containerPort: 3000 }
   *           }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   */
  events?: (
    | ContainerWorkloadHttpApiIntegration
    | ContainerWorkloadLoadBalancerIntegration
    | ContainerWorkloadInternalIntegration
    | ContainerWorkloadServiceConnectIntegration
    | ContainerWorkloadNetworkLoadBalancerIntegration
  )[];
  /**
   * #### Load balancer health check settings. Only applies when integrated with an ALB or NLB.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *           loadBalancerHealthCheck:
   *             healthcheckPath: /health
   *             healthcheckInterval: 10
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ],
   *         loadBalancerHealthCheck: { healthcheckPath: '/health', healthcheckInterval: 10 }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   */
  loadBalancerHealthCheck?: LoadBalancerHealthCheck;
}

interface ContainerEfsMount {
  /**
   * #### The type of the volume mount.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: sharedStorage
   *                 mountPath: /data
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   sharedStorage:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, EfsFilesystem, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sharedStorage = new EfsFilesystem({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         volumeMounts: [
   *           {
   *             type: 'efs',
   *             properties: { efsFilesystemName: 'sharedStorage', mountPath: '/data' }
   *           }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, sharedStorage } };
   * });
   * ```
   */
  type: 'efs';
  /**
   * #### Properties for the EFS volume mount.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: sharedStorage
   *                 mountPath: /data
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   sharedStorage:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, EfsFilesystem, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sharedStorage = new EfsFilesystem({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         volumeMounts: [
   *           {
   *             type: 'efs',
   *             properties: { efsFilesystemName: 'sharedStorage', mountPath: '/data' }
   *           }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, sharedStorage } };
   * });
   * ```
   */
  properties: ContainerEfsMountProps;
}

interface ContainerEfsMountProps {
  /**
   * #### Name of the `efs-filesystem` resource defined in your config.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: sharedStorage
   *                 mountPath: /data
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   sharedStorage:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, EfsFilesystem, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sharedStorage = new EfsFilesystem({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         volumeMounts: [
   *           {
   *             type: 'efs',
   *             properties: {
   *               efsFilesystemName: 'sharedStorage',
   *               mountPath: '/data'
   *             }
   *           }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, sharedStorage } };
   * });
   * ```
   */
  efsFilesystemName: string;
  /**
   * #### Subdirectory within the EFS filesystem to mount. Restricts access to that directory.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: sharedStorage
   *                 rootDirectory: /uploads
   *                 mountPath: /data
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   sharedStorage:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, EfsFilesystem, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sharedStorage = new EfsFilesystem({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         volumeMounts: [
   *           {
   *             type: 'efs',
   *             properties: {
   *               efsFilesystemName: 'sharedStorage',
   *               rootDirectory: '/uploads',
   *               mountPath: '/data'
   *             }
   *           }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, sharedStorage } };
   * });
   * ```
   *
   * @default "/"
   */
  rootDirectory?: string;
  /**
   * #### Absolute path inside the container where the volume is mounted (e.g., `/data`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: sharedStorage
   *                 mountPath: /data
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   sharedStorage:
   *     type: efs-filesystem
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, EfsFilesystem, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sharedStorage = new EfsFilesystem({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         volumeMounts: [
   *           {
   *             type: 'efs',
   *             properties: {
   *               efsFilesystemName: 'sharedStorage',
   *               mountPath: '/data'
   *             }
   *           }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, sharedStorage } };
   * });
   * ```
   */
  mountPath: string;
}

interface LoadBalancerHealthCheck {
  /**
   * #### Path the load balancer pings to check container health.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *           loadBalancerHealthCheck:
   *             healthcheckPath: /health
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ],
   *         loadBalancerHealthCheck: {
   *           healthcheckPath: '/health'
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   *
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *           loadBalancerHealthCheck:
   *             healthcheckPath: /health
   *             healthcheckInterval: 15
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ],
   *         loadBalancerHealthCheck: {
   *           healthcheckPath: '/health',
   *           healthcheckInterval: 15
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   *
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *           loadBalancerHealthCheck:
   *             healthcheckPath: /health
   *             healthcheckTimeout: 3
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ],
   *         loadBalancerHealthCheck: {
   *           healthcheckPath: '/health',
   *           healthcheckTimeout: 3
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   *
   * @default 4
   */
  healthcheckTimeout?: number;
  /**
   * #### Health check protocol. ALB defaults to `HTTP`, NLB defaults to `TCP`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *           loadBalancerHealthCheck:
   *             healthCheckProtocol: HTTP
   *             healthcheckPath: /health
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ],
   *         loadBalancerHealthCheck: {
   *           healthCheckProtocol: 'HTTP',
   *           healthcheckPath: '/health'
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   */
  healthCheckProtocol?: 'HTTP' | 'TCP';
  /**
   * #### Health check port. Defaults to the traffic port.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: web
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/index.ts
   *           events:
   *             - type: application-load-balancer
   *               properties:
   *                 loadBalancerName: appLb
   *                 priority: 1
   *                 containerPort: 3000
   *           loadBalancerHealthCheck:
   *             healthcheckPath: /health
   *             healthCheckPort: 3000
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   *   appLb:
   *     type: application-load-balancer
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appLb = new ApplicationLoadBalancer({});
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'web',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
   *         events: [
   *           { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
   *         ],
   *         loadBalancerHealthCheck: {
   *           healthcheckPath: '/health',
   *           healthCheckPort: 3000
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app, appLb } };
   * });
   * ```
   */
  healthCheckPort?: number;
}

// interface ContainerWorkloadPort {
//   number: number;
//   integrations?: (
//     | ContainerWorkloadHttpApiIntegration
//     | ContainerWorkloadLoadBalancerIntegration
//     | ContainerWorkloadServiceConnectIntegration
//   )[];
// }

interface ContainerDependency {
  /**
   * The name of the container that this container depends on.
   */
  containerName: string;
  /**
   * #### The condition that the dependency container must meet.
   * ---
   * Available conditions:
   * - `START`: The dependency has started.
   * - `COMPLETE`: The dependency has finished executing (regardless of success).
   * - `SUCCESS`: The dependency has finished with an exit code of `0`.
   * - `HEALTHY`: The dependency has passed its first health check.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: redis
   *           packaging:
   *             type: prebuilt-image
   *             properties:
   *               image: redis:7
   *           internalHealthCheck:
   *             healthCheckCommand:
   *               - CMD-SHELL
   *               - redis-cli ping || exit 1
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           dependsOn:
   *             - containerName: redis
   *               condition: HEALTHY
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, PrebuiltImagePackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'redis',
   *         packaging: new PrebuiltImagePackaging({ image: 'redis:7' }),
   *         internalHealthCheck: { healthCheckCommand: ['CMD-SHELL', 'redis-cli ping || exit 1'] }
   *       },
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         dependsOn: [
   *           {
   *             containerName: 'redis',
   *             condition: 'HEALTHY'
   *           }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  condition: 'COMPLETE' | 'HEALTHY' | 'START' | 'SUCCESS';
}

// interface ContainerWorkloadPort {
//   /**
//    * port number to expose on the container
//    */
//   containerPort: number;
//   /**
//    * port protocol. default is <b>tcp</b>
//    */
//   protocol?: 'udp' | 'tcp'; // tcp is default
//   // removing loadBalancerCheck for time being (for simplicity)
//   // loadBalancerCheck?: LoadBalancerAvailabilityCheck;
// }

interface ContainerHealthCheck {
  /**
   * #### Command to check health. E.g., `["CMD-SHELL", "curl -f http://localhost/ || exit 1"]`. Exit 0 = healthy.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           internalHealthCheck:
   *             healthCheckCommand:
   *               - CMD-SHELL
   *               - curl -f http://localhost:3000/ || exit 1
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         internalHealthCheck: {
   *           healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1']
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  healthCheckCommand: string[];
  /**
   * #### Seconds between health checks (5-300).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           internalHealthCheck:
   *             healthCheckCommand:
   *               - CMD-SHELL
   *               - curl -f http://localhost:3000/ || exit 1
   *             intervalSeconds: 60
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         internalHealthCheck: {
   *           healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
   *           intervalSeconds: 60
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 30
   */
  intervalSeconds?: number;
  /**
   * #### Seconds before a check is considered failed (2-60).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           internalHealthCheck:
   *             healthCheckCommand:
   *               - CMD-SHELL
   *               - curl -f http://localhost:3000/ || exit 1
   *             timeoutSeconds: 10
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         internalHealthCheck: {
   *           healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
   *           timeoutSeconds: 10
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 5
   */
  timeoutSeconds?: number;
  /**
   * #### Consecutive failures before marking unhealthy (1-10).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           internalHealthCheck:
   *             healthCheckCommand:
   *               - CMD-SHELL
   *               - curl -f http://localhost:3000/ || exit 1
   *             retries: 5
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         internalHealthCheck: {
   *           healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
   *           retries: 5
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   *
   * @default 3
   */
  retries?: number;
  /**
   * #### Grace period (seconds) before counting failures. Gives the container time to start (0-300).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   app:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: api
   *           packaging:
   *             type: stacktape-image-buildpack
   *             properties:
   *               entryfilePath: src/server.ts
   *           internalHealthCheck:
   *             healthCheckCommand:
   *               - CMD-SHELL
   *               - curl -f http://localhost:3000/ || exit 1
   *             startPeriodSeconds: 60
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const app = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'api',
   *         packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
   *         internalHealthCheck: {
   *           healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
   *           startPeriodSeconds: 60
   *         }
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *   return { resources: { app } };
   * });
   * ```
   */
  startPeriodSeconds?: number;
}

interface LoadBalancerAvailabilityCheck {
  httpPath?: string;
  intervalSeconds?: number;
}

interface ECSBlueGreenService {
  Type: 'Stacktape::ECSBlueGreenV1::Service';
  Properties: {
    ECSService: import('@cloudform/ecs/service').ServiceProperties;
    StackName: import('@cloudform/dataTypes').Value<string>;
    CodeDeployApplicationName: import('@cloudform/dataTypes').Value<string>;
    CodeDeployDeploymentGroupName: import('@cloudform/dataTypes').Value<string>;
    LifecycleEventHooks: {
      AfterAllowTraffic: import('@cloudform/dataTypes').Value<string>;
      BeforeAllowTraffic: import('@cloudform/dataTypes').Value<string>;
    };
  };
  DependsOn: string[];
}

type ContainerWorkloadReferencableParam = 'logGroupArn';

type ContainerWorkloadEvent =
  | ContainerWorkloadLoadBalancerIntegration
  | ContainerWorkloadHttpApiIntegration
  | ContainerWorkloadInternalIntegration
  | ContainerWorkloadServiceConnectIntegration
  | ContainerWorkloadNetworkLoadBalancerIntegration;
```

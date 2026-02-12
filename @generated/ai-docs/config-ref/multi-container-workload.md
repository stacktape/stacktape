---
docType: config-ref
title: Container Workload
resourceType: multi-container-workload
tags:
  - multi-container-workload
  - multi-container
  - sidecar
source: types/stacktape-config/multi-container-workloads.d.ts
priority: 1
---

# Container Workload

Run multiple containers together as a single unit with shared compute resources.

For advanced setups: sidecars, init containers, or services that need multiple processes.
Supports Fargate (serverless) or EC2 (custom instances). Auto-scales horizontally.

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
   */
  containers: ContainerWorkloadContainer[];
  /**
   * #### CPU, memory, and compute engine (Fargate or EC2).
   *
   * ---
   *
   * - **Fargate** (set `cpu` + `memory`): Serverless, no servers to manage.
   * - **EC2** (set `instanceTypes`): Choose specific instance types for more control or GPU access.
   */
  resources: ContainerWorkloadResourcesConfig;
  /**
   * period of time scheduler should ignore unhealthy load balancer health checks after a task has first started.
   * This is only used when your multi-container-workload is configured to use a load balancer. This grace period can prevent the service scheduler from marking workload instances as unhealthy and stopping them before they have time to come up.
   */
  // loadBalancerCheckGracePeriodSeconds?: number;
  /**
   * #### Auto-scaling: how many instances and when to add/remove them.
   */
  scaling?: ContainerWorkloadScaling;
  /**
   * #### Gradual traffic shifting (canary/linear) for safe deployments. Requires an ALB integration.
   */
  deployment?: ContainerWorkloadDeploymentConfig;
  /**
   * #### Enable `stacktape container:session` for interactive shell access to running containers.
   */
  enableRemoteSessions?: boolean;
  /**
   * #### Run in private subnets with a NAT Gateway for outbound internet. Gives you a static public IP.
   *
   * ---
   *
   * Useful for IP whitelisting with third-party APIs. NAT Gateway costs ~$32/month per AZ + data processing fees.
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
   */
  strategy:
    | 'Canary10Percent5Minutes'
    | 'Canary10Percent15Minutes'
    | 'Linear10PercentEvery1Minutes'
    | 'Linear10PercentEvery3Minutes'
    | 'AllAtOnce';
  /**
   * #### Lambda function to run before traffic shifts to the new version (for validation/smoke tests).
   */
  beforeAllowTrafficFunction?: string;
  /**
   * #### Lambda function to run after all traffic has shifted (for post-deployment checks).
   */
  afterTrafficShiftFunction?: string;
  /**
   * #### ALB listener port for test traffic. Only needed with `beforeAllowTrafficFunction` and custom listeners.
   */
  testListenerPort?: number;
}

interface ContainerWorkloadResourcesConfig {
  /**
   * #### vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.
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
   */
  memory?: number;
  /**
   * #### EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.
   *
   * ---
   *
   * First type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.
   * Tip: specify a single type and omit `cpu`/`memory` for optimal sizing.
   */
  instanceTypes?: string[];
  /**
   * #### Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.
   */
  enableWarmPool?: boolean;
  /**
   * #### CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.
   * @default 'x86_64'
   */
  architecture?: 'x86_64' | 'arm64';
}

interface ContainerWorkloadScaling {
  /**
   * #### Minimum running instances. Set to 0 is not supported — minimum is 1.
   * @default 1
   */
  minInstances?: number;
  /**
   * #### Maximum running instances. Traffic is distributed across all instances.
   * @default 1
   */
  maxInstances?: number;
  /**
   * #### When to scale: CPU and/or memory utilization targets.
   */
  scalingPolicy?: ContainerWorkloadScalingPolicy;
}

interface ContainerWorkloadScalingPolicy {
  /**
   * #### Scale out when avg CPU exceeds this %, scale in when it drops below.
   * @default 80
   */
  keepAvgCpuUtilizationUnder?: number;
  /**
   * #### Scale out when avg memory exceeds this %, scale in when it drops below.
   * @default 80
   */
  keepAvgMemoryUtilizationUnder?: number;
}

interface ContainerWorkloadContainerLogging extends LogForwardingBase {
  /**
   * #### Disable logging to CloudWatch.
   * @default false
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

interface ContainerWorkloadContainerBase {
  /**
   * #### Unique container name within this workload.
   */
  name: string;
  /**
   * #### How to build or specify the container image.
   */
  packaging: ContainerWorkloadContainerPackaging;
  /**
   * #### If `true` (default), the entire workload restarts when this container fails.
   */
  essential?: boolean;
  /**
   * #### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.
   */
  logging?: ContainerWorkloadContainerLogging;
  /**
   * #### Start this container only after the listed containers reach a specific state.
   *
   * ---
   *
   * E.g., wait for a database sidecar to be `HEALTHY` before starting the app container.
   */
  dependsOn?: ContainerDependency[];
  /**
   * #### Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Command-based health check. If it fails on an essential container, the workload instance is replaced.
   */
  internalHealthCheck?: ContainerHealthCheck;
  /**
   * #### Seconds to wait after SIGTERM before SIGKILL (2-120).
   * @default 2
   */
  stopTimeout?: number;
  /**
   * #### Mount EFS volumes for persistent, shared storage across containers.
   */
  volumeMounts?: ContainerEfsMount[];
}

interface ContainerWorkloadContainer extends ContainerWorkloadContainerBase {
  /**
   * #### How this container receives traffic (API Gateway, load balancer, or service-connect).
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
   */
  loadBalancerHealthCheck?: LoadBalancerHealthCheck;
}

interface ContainerEfsMount {
  /**
   * #### The type of the volume mount.
   */
  type: 'efs';
  /**
   * #### Properties for the EFS volume mount.
   */
  properties: ContainerEfsMountProps;
}

interface ContainerEfsMountProps {
  /**
   * #### Name of the `efs-filesystem` resource defined in your config.
   */
  efsFilesystemName: string;
  /**
   * #### Subdirectory within the EFS filesystem to mount. Restricts access to that directory.
   * @default "/"
   */
  rootDirectory?: string;
  /**
   * #### Absolute path inside the container where the volume is mounted (e.g., `/data`).
   */
  mountPath: string;
}

interface LoadBalancerHealthCheck {
  /**
   * #### Path the load balancer pings to check container health.
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### Seconds between health checks.
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### Seconds before a health check is considered failed.
   * @default 4
   */
  healthcheckTimeout?: number;
  /**
   * #### Health check protocol. ALB defaults to `HTTP`, NLB defaults to `TCP`.
   */
  healthCheckProtocol?: 'HTTP' | 'TCP';
  /**
   * #### Health check port. Defaults to the traffic port.
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
   */
  healthCheckCommand: string[];
  /**
   * #### Seconds between health checks (5-300).
   * @default 30
   */
  intervalSeconds?: number;
  /**
   * #### Seconds before a check is considered failed (2-60).
   * @default 5
   */
  timeoutSeconds?: number;
  /**
   * #### Consecutive failures before marking unhealthy (1-10).
   * @default 3
   */
  retries?: number;
  /**
   * #### Grace period (seconds) before counting failures. Gives the container time to start (0-300).
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

/**
 * #### A resource for running and managing containerized applications.
 *
 * ---
 *
 * A multi-container workload is a fully managed, auto-scaling, and easy-to-use runtime for your Docker containers.
 * It allows you to run one or more containers together with shared resources.
 */
interface ContainerWorkload {
  type: 'multi-container-workload';
  properties: ContainerWorkloadProps;
  overrides?: ResourceOverrides;
}

interface ContainerWorkloadProps extends ResourceAccessProps {
  /**
   * #### A list of containers that will run in this workload.
   *
   * ---
   *
   * A workload can consist of one or more containers. Containers within the same workload share computing resources and scale together as a single unit.
   */
  containers: ContainerWorkloadContainer[];
  /**
   * #### Configures the computing resources (CPU, memory, and instance types) for the workload.
   *
   * ---
   *
   * You can choose between two compute engines:
   * - **Fargate**: A serverless option where you don't need to manage the underlying servers. You specify CPU and memory, and AWS handles the rest. This is the simplest way to run containers.
   * - **EC2**: This option gives you fine-grained control over the underlying virtual machines (instances). You can choose specific EC2 instance types to optimize for your workload's needs.
   *
   * To use Fargate, specify the `cpu` and `memory` properties. To use EC2, specify the `instanceTypes` property.
   */
  resources: ContainerWorkloadResourcesConfig;
  /**
   * period of time scheduler should ignore unhealthy load balancer health checks after a task has first started.
   * This is only used when your multi-container-workload is configured to use a load balancer. This grace period can prevent the service scheduler from marking workload instances as unhealthy and stopping them before they have time to come up.
   */
  // loadBalancerCheckGracePeriodSeconds?: number;
  /**
   * #### Configures how the workload scales in and out.
   *
   * ---
   *
   * Scaling is handled horizontally, meaning more instances of your workload are added to handle increased demand.
   * Incoming traffic is automatically distributed among the available instances.
   */
  scaling?: ContainerWorkloadScaling;
  /**
   * #### Configures the deployment strategy for updating the workload.
   *
   * ---
   *
   * This allows for safe, gradual deployments. Instead of instantly replacing the old version, traffic is shifted to the new version over time.
   * This provides an opportunity to monitor for issues and roll back if necessary.
   *
   * Supported strategies include Canary, Linear, and AllAtOnce deployments.
   *
   * > **Note:** To use gradual deployments, your workload must be integrated with an Application Load Balancer.
   */
  deployment?: ContainerWorkloadDeploymentConfig;
  /**
   * #### Enables interactive shell access to running containers.
   *
   * ---
   *
   * When enabled, you can use the `stacktape container:session` command to get a shell inside a running container.
   * This is useful for debugging and inspecting your application in a live environment.
   * It uses AWS ECS Exec and SSM Session Manager for secure connections.
   */
  enableRemoteSessions?: boolean;
  /**
   * #### Deploys the workload in private subnets with internet access through NAT Gateway.
   *
   * ---
   *
   * When the workload is in a private subnet, it does not have public IP and direct internet access.
   * Instead, all outbound internet traffic is routed through a NAT Gateway.
   *
   * You can assign a static public IP address to the NAT Gateway and configure high availability using `stackConfig.vpcSettings`.
   * This allows you to whitelist your service's IP address in external services (e.g., third-party APIs, databases, payment gateways).
   *
   * **Cost considerations:**
   * - NAT Gateways incur additional AWS charges for both the gateway itself and data processing
   *
   * @default false
   */
  usePrivateSubnetsWithNAT?: boolean;
}

interface ContainerWorkloadDeploymentConfig {
  /**
   * #### The strategy to use for deploying updates.
   *
   * ---
   *
   * - **Canary10Percent5Minutes**: Shifts 10% of traffic, then the rest after 5 minutes.
   * - **Canary10Percent15Minutes**: Shifts 10% of traffic, then the rest after 15 minutes.
   * - **Linear10PercentEvery1Minute**: Shifts 10% of traffic every minute.
   * - **Linear10PercentEvery3Minutes**: Shifts 10% of traffic every 3 minutes.
   * - **AllAtOnce**: Shifts all traffic at once.
   */
  strategy:
    | 'Canary10Percent5Minutes'
    | 'Canary10Percent15Minutes'
    | 'Linear10PercentEvery1Minutes'
    | 'Linear10PercentEvery3Minutes'
    | 'AllAtOnce';
  /**
   * #### The name of a Lambda function to run before traffic shifting begins.
   *
   * ---
   *
   * This "hook" function is typically used to run validation checks before the new version receives production traffic.
   * The function must signal success or failure to CodeDeploy. For more details, see the [documentation](https://docs.stacktape.com/compute-resources/multi-container-workloads/#hook-functions).
   */
  beforeAllowTrafficFunction?: string;
  /**
   * #### The name of a Lambda function to run after all traffic has been shifted.
   *
   * ---
   *
   * This "hook" function is typically used for post-deployment validation.
   * The function must signal success or failure to CodeDeploy. For more details, see the [documentation](https://docs.stacktape.com/compute-resources/multi-container-workloads/#hook-functions).
   */
  afterTrafficShiftFunction?: string;
  /**
   * #### The port of the listener to be used for test traffic.
   *
   * ---
   *
   * If you are using `beforeAllowTrafficFunction` with a custom listener on your load balancer, specify the listener port here.
   * To learn how to use this, see the [test listener documentation](https://docs.stacktape.com/compute-resources/multi-container-workloads/#test-traffic-listener).
   */
  testListenerPort?: number;
}

type StpContainerWorkload = ContainerWorkload['properties'] & {
  name: string;
  type: ContainerWorkload['type'];
  configParentResourceType:
    | WebService['type']
    | PrivateService['type']
    | WorkerService['type']
    | ContainerWorkload['type'];
  nameChain: string[];
};
// type StpWebServiceContainerWorkload = Omit<StpContainerWorkload, 'type'> & { type: WebService['type'] };

interface ContainerWorkloadResourcesConfig {
  /**
   * #### The number of virtual CPUs allocated to the workload.
   *
   * ---
   *
   * When using EC2 `instanceTypes`, the vCPUs of the instance are shared among the containers running on it.
   */
  cpu?: 0.25 | 0.5 | 1 | 2 | 4 | 8 | 16;
  /**
   * #### The amount of memory (in MB) allocated to the workload.
   *
   * ---
   *
   * **For Fargate:** You must choose a value compatible with your selected vCPU count.
   *   - 0.25 vCPU: 512, 1024, 2048 MB
   *   - 0.5 vCPU: 1024, 2048, 3072, 4096 MB
   *   - 1 vCPU: 2048-8192 MB (in 1024 MB increments)
   *   - 2 vCPU: 4096-16384 MB (in 1024 MB increments)
   *   - 4 vCPU: 8192-30720 MB (in 1024 MB increments)
   *   - 8 vCPU: 16384-61440 MB (in 4096 MB increments)
   *   - 16 vCPU: 32768-122880 MB (in 8192 MB increments)
   *
   * **For EC2:** If you don't specify this, Stacktape will automatically allocate the maximum memory available on the smallest specified `instanceType`.
   */
  memory?: number;
  /**
   * #### The types of EC2 instances (virtual machines) that can be used for the workload.
   *
   * ---
   *
   * Instances are automatically added or removed to meet scaling demands.
   *
   * > **Recommendation:** For optimal resource utilization, specify a single instance type and omit the `cpu` and `memory` properties. Stacktape will then size the containers to fit the instance perfectly.
   *
   * The order of instance types matters; the first in the list is preferred.
   * For a full list of instance types, see the [AWS EC2 instance types documentation](https://aws.amazon.com/ec2/instance-types/).
   *
   * > Instances are automatically refreshed weekly to ensure they are patched and up-to-date. Your workload remains available during this process.
   */
  instanceTypes?: string[];
  /**
   * #### Enables a warm pool for EC2 Auto Scaling.
   *
   * ---
   *
   * > **Note:** This only works when a single instance type is specified.
   *
   * A warm pool keeps pre-initialized EC2 instances in a stopped state, ready to launch quickly for faster scale-out events.
   * This improves scaling performance and can reduce costs, as you only pay for storage on stopped instances.
   * For more details, see the [AWS Auto Scaling warm pools documentation](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html).
   */
  enableWarmPool?: boolean;
  /**
   * #### The CPU architecture for the containers (only applies to Fargate).
   *
   * ---
   *
   * - **x86_64**: Traditional 64-bit architecture.
   * - **arm64**: Modern ARM-based architecture, which is often ~20% cheaper.
   *
   * If you are using a buildpack-based packaging method, Stacktape will automatically build for the target architecture.
   * If you are using a `prebuilt-image`, ensure it supports the specified architecture.
   *
   * > This property is ignored if you specify `instanceTypes`, as the architecture is determined by the EC2 instances.
   *
   * @default 'x86_64'
   */
  architecture?: 'x86_64' | 'arm64';
}

interface ContainerWorkloadScaling {
  /**
   * #### The minimum number of workload instances to keep running.
   *
   * @default 1
   */
  minInstances?: number;
  /**
   * #### The maximum number of workload instances that can be running.
   *
   * @default 1
   */
  maxInstances?: number;
  /**
   * #### Configures the triggers for scaling actions.
   */
  scalingPolicy?: ContainerWorkloadScalingPolicy;
}

interface ContainerWorkloadScalingPolicy {
  /**
   * #### The average CPU utilization target for scaling.
   *
   * ---
   *
   * If the average CPU utilization across all instances exceeds this value, a new instance is added (scale-out).
   * If it falls below this value, an instance is removed (scale-in).
   *
   * @default 80
   */
  keepAvgCpuUtilizationUnder?: number;
  /**
   * #### The average memory utilization target for scaling.
   *
   * ---
   *
   * If the average memory utilization across all instances exceeds this value, a new instance is added (scale-out).
   * If it falls below this value, an instance is removed (scale-in).
   *
   * @default 80
   */
  keepAvgMemoryUtilizationUnder?: number;
}

interface ContainerWorkloadContainerLogging extends LogForwardingBase {
  /**
   * #### Disables application logging to CloudWatch for this container.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### The number of days to retain logs in CloudWatch.
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

interface ContainerWorkloadContainerBase {
  /**
   * #### A unique name for the container within the workload.
   */
  name: string;
  /**
   * #### Configures the container image.
   */
  packaging: ContainerWorkloadContainerPackaging;
  /**
   * #### Determines if this container is critical for the workload's health.
   *
   * ---
   *
   * If an essential container fails or stops, all other containers in the same workload instance are also stopped. The entire instance is then terminated and replaced.
   */
  essential?: boolean;
  /**
   * #### Configures the logging behavior for this container.
   *
   * ---
   *
   * Container logs (`stdout` and `stderr`) are automatically sent to a CloudWatch log group.
   *
   * You can view logs in two ways:
   *   - Through the AWS CloudWatch console. Use the `stacktape stack-info` command to get a direct link.
   *   - Using the `stacktape logs` command to stream logs directly to your terminal.
   */
  logging?: ContainerWorkloadContainerLogging;
  /**
   * #### A list of other containers that this container depends on to start.
   *
   * ---
   *
   * This defines the startup order for containers within the workload.
   * For example, you can require a database container to be `HEALTHY` before your application container starts.
   */
  dependsOn?: ContainerDependency[];
  /**
   * #### Environment variables to inject into the container.
   *
   * ---
   *
   * Environment variables are ideal for providing configuration details to your container, such as database connection strings, API keys, or other dynamic parameters.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Configures an internal health check to determine if the container is healthy.
   *
   * ---
   *
   * If this health check fails for an essential container, the entire workload instance will be terminated and replaced.
   */
  internalHealthCheck?: ContainerHealthCheck;
  /**
   * #### The time (in seconds) to wait before forcefully killing the container if it doesn't shut down gracefully.
   *
   * ---
   *
   * When a container is stopped, it first receives a `SIGTERM` signal. If it doesn't exit within this timeout, it will be sent a `SIGKILL` signal.
   * This allows for graceful shutdown procedures. The timeout must be between 2 and 120 seconds.
   *
   * @default 2
   */
  stopTimeout?: number;
  /**
   * #### A list of file system volumes to mount to the container.
   *
   * ---
   *
   * Volumes provide persistent storage that can be shared across multiple containers and persists even if the container is stopped or replaced.
   * Currently, only EFS (Elastic File System) volumes are supported.
   */
  volumeMounts?: ContainerEfsMount[];
}

interface ContainerWorkloadContainer extends ContainerWorkloadContainerBase {
  /**
   * #### Configures how this container receives traffic and events.
   *
   * ---
   *
   * Event integrations allow containers to:
   * - Receive requests from load balancers.
   * - Communicate with other containers in the same workload.
   */
  events?: (
    | ContainerWorkloadHttpApiIntegration
    | ContainerWorkloadLoadBalancerIntegration
    | ContainerWorkloadInternalIntegration
    | ContainerWorkloadServiceConnectIntegration
    | ContainerWorkloadNetworkLoadBalancerIntegration
  )[];
  /**
   * #### Configures how a load balancer checks the health of this container.
   *
   * ---
   *
   * > This property only has an effect if the container is integrated with an Application Load Balancer or Network Load Balancer.
   * @todo
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
   * #### The name of the EFS filesystem to mount.
   *
   * ---
   *
   * This must match the name of an EFS filesystem defined in your Stacktape configuration.
   */
  efsFilesystemName: string;
  /**
   * #### The root directory within the EFS filesystem to mount.
   *
   * ---
   *
   * This restricts the container's access to a specific directory within the filesystem. If not specified, the container can access the entire filesystem.
   *
   * @default "/"
   */
  rootDirectory?: string;

  /**
   * #### The path where the EFS volume will be mounted inside the container.
   *
   * ---
   *
   * This must be an absolute path, for example: `/data` or `/app/storage`.
   */
  mountPath: string;
}

interface LoadBalancerHealthCheck {
  /**
   * #### The path on which the load balancer performs health checks.
   * ---
   * @todo
   * @default /
   */
  healthcheckPath?: string;
  /**
   * #### The interval (in seconds) between health checks.
   * ---
   * @todo
   * @default 5
   */
  healthcheckInterval?: number;
  /**
   * #### The timeout (in seconds) for a health check to be considered failed.
   * ---
   * @todo
   * @default 4
   */
  healthcheckTimeout?: number;
  /**
   * #### The protocol the load balancer uses for health checks.
   * ---
   * - For Application Load Balancers, the default is `HTTP`.
   * - For Network Load Balancers, the default is `TCP`.
   */
  healthCheckProtocol?: 'HTTP' | 'TCP';
  /**
   * #### The port the load balancer uses for health checks.
   * ---
   * - By default, this is the same port that receives traffic from the load balancer.
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
   * #### The command to run to determine if the container is healthy.
   *
   * ---
   *
   * - Must start with `CMD` (execute command directly) or `CMD-SHELL` (run with the container's default shell).
   * - An exit code of `0` indicates success; any other exit code indicates failure.
   * - Example: `[ "CMD-SHELL", "curl -f http://localhost/ || exit 1" ]`
   */
  healthCheckCommand: string[];
  /**
   * #### The time period (in seconds) between health checks.
   * ---
   * Must be between 5 and 300 seconds.
   * @default 30
   */
  intervalSeconds?: number;
  /**
   * #### The time period (in seconds) to wait for a health check to succeed before it is considered failed.
   * ---
   * Must be between 2 and 60 seconds.
   * @default 5
   */
  timeoutSeconds?: number;
  /**
   * #### The number of consecutive failed health checks required before the container is considered unhealthy.
   * ---
   * Must be between 1 and 10.
   * @default 3
   */
  retries?: number;
  /**
   * #### A grace period (in seconds) to allow the container to start before failed health checks are counted.
   * ---
   * Must be between 0 and 300 seconds. Disabled by default.
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

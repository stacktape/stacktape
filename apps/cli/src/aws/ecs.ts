import type { KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { CreateDeploymentCommandInput, CodeDeployClient } from '@aws-sdk/client-codedeploy';
import { CreateDeploymentCommand, waitUntilDeploymentSuccessful } from '@aws-sdk/client-codedeploy';
import type {
  ContainerDefinition,
  Deployment,
  DescribeServicesCommandInput,
  DescribeServicesCommandOutput,
  DesiredStatus,
  ECSClient,
  ExecuteCommandCommandInput,
  RegisterTaskDefinitionCommandInput,
  Service,
  Session,
  SettingName,
  Task,
  UpdateServiceCommandInput
} from '@aws-sdk/client-ecs';
import {
  DeploymentRolloutState,
  DescribeContainerInstancesCommand,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  ExecuteCommandCommand,
  ListServiceDeploymentsCommand,
  ListTasksCommand,
  PutAccountSettingDefaultCommand,
  RegisterTaskDefinitionCommand,
  UpdateServiceCommand
} from '@aws-sdk/client-ecs';
import type { ElasticLoadBalancingV2Client } from '@aws-sdk/client-elastic-load-balancing-v2';
import { DescribeTargetHealthCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import type { ServiceDiscoveryClient } from '@aws-sdk/client-servicediscovery';
import {
  DiscoverInstancesCommand,
  GetNamespaceCommand,
  GetServiceCommand,
  HealthStatusFilter
} from '@aws-sdk/client-servicediscovery';
import type { StartSessionResponse } from '@aws-sdk/client-ssm';
import { createWaiter, WaiterState } from '@smithy/util-waiter';
import { chunkArray, lowerCaseFirstCharacterOfObjectKeys, serialize, wait } from '@utils/misc';

/** CloudFormation and the ECS SDK use different casing, including nested container properties. */
export const toRegisterTaskDefinitionInput = (
  definition: KnownCloudFormationResource<'AWS::ECS::TaskDefinition'>
): RegisterTaskDefinitionCommandInput => serialize(lowerCaseFirstCharacterOfObjectKeys(definition.Properties));

/** The session-manager plugin consumes SSM-shaped session fields even for an ECS Exec response. */
export const toSessionManagerSession = ({ sessionId, streamUrl, tokenValue }: Session): StartSessionResponse => ({
  SessionId: sessionId,
  StreamUrl: streamUrl,
  TokenValue: tokenValue
});

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

/** A load balancer target that must be healthy before a new task counts as serving. */
type ServingTarget = { targetGroupArn: string; id: string; port: number };
/** A Cloud Map instance (ECS registers each task under its task ID) that API Gateway must be able to discover. */
type ServingInstance = { serviceId: string; instanceId: string };

export type NewTasksServingPlan =
  /** The new tasks cannot be shown to serve from health signals; ECS decides when the deployment is done. */
  | { verdict: 'undecidable'; reason: string }
  | { verdict: 'waiting'; reason: string }
  /** Configured health checks passed; these targets must be healthy and these instances discoverable. */
  | { verdict: 'check'; targets: ServingTarget[]; instances: ServingInstance[] };

const taskIp = (task: Task) =>
  task.attachments
    ?.find(({ type }) => type === 'ElasticNetworkInterface')
    ?.details?.find(({ name }) => name === 'privateIPv4Address')?.value;

/**
 * Which health signals prove that the new tasks of a rolling deployment serve traffic.
 *
 * Behind target groups, the new tasks must be healthy targets in every one of them, for at least
 * `LOAD_BALANCER_ROUTING_ALLOWANCE_MS`. With EC2 bridge networking the target is the task's EC2 instance and the host
 * port Docker mapped to the container port. Cloud Map web services without a configured health check may opt into
 * finishing once the new tasks are RUNNING and discoverable. This shows registration, not application health: the app
 * may still be initializing or never listen. Other services reached without target groups need an essential container
 * health check, or ECS decides when the rollout is done.
 *
 * Behind a load balancer, the task's own state is not required: a task whose target is healthy listens, whatever ECS reports. ECS reports a
 * task ACTIVATING or RUNNING seconds after the load balancer reported its target healthy, and the target is the task's
 * own address and port, so no other task can make it healthy.
 *
 * Behind an HTTP API, the new tasks' Cloud Map instances must be discoverable the way API Gateway discovers them; see
 * `API_GATEWAY_ROUTING_ALLOWANCE_MS`. Neither the task's health nor its Cloud Map health status shows that: API Gateway
 * sent a new task its first request 8 to 24 seconds after the task turned healthy, and from 33 seconds before to 25
 * seconds after Cloud Map reported it healthy. ECS early success counts the task alone, which reported such deploys done
 * before any request reached the new version.
 */
export const planNewTasksServingChecks = ({
  deployment,
  service,
  containerDefinitions,
  tasks,
  allowUncheckedDiscovery = false,
  ec2InstanceIdOf = () => undefined
}: {
  deployment: Pick<Deployment, 'serviceConnectConfiguration'>;
  /** A new deployment starts with no desired task and grows to the service's count, so the service's count is used. */
  service: Pick<Service, 'desiredCount' | 'loadBalancers' | 'serviceRegistries'>;
  /** The deployment's task definition. */
  containerDefinitions: ContainerDefinition[];
  /** The tasks the deployment started. */
  tasks: Task[];
  /** Only HTTP API web services opt in; registration does not prove application health. */
  allowUncheckedDiscovery?: boolean;
  /** The EC2 instance a task runs on, for tasks without their own network interface (EC2 bridge networking). */
  ec2InstanceIdOf?: (task: Task) => string | undefined;
}): NewTasksServingPlan => {
  const desiredCount = service.desiredCount ?? 0;
  if (!desiredCount) {
    return { verdict: 'undecidable', reason: 'the service runs no task' };
  }
  const loadBalancers = service.loadBalancers ?? [];
  if (loadBalancers.some(({ targetGroupArn, containerPort }) => !targetGroupArn || !containerPort)) {
    return { verdict: 'undecidable', reason: 'a load balancer has no target group' };
  }
  const serviceRegistries = service.serviceRegistries ?? [];
  const hasHealthCheck = containerDefinitions.some(({ healthCheck, essential }) => healthCheck && essential !== false);
  const reachedWithoutTargetGroup =
    serviceRegistries.length > 0 || !!deployment.serviceConnectConfiguration?.enabled || !loadBalancers.length;
  const uncheckedDiscovery =
    allowUncheckedDiscovery &&
    !hasHealthCheck &&
    serviceRegistries.length > 0 &&
    !loadBalancers.length &&
    !deployment.serviceConnectConfiguration?.enabled;
  if (reachedWithoutTargetGroup && !hasHealthCheck && !uncheckedDiscovery) {
    return { verdict: 'undecidable', reason: 'no health check shows when a new task is ready' };
  }
  const running = tasks.filter(
    ({ desiredStatus, lastStatus }) => desiredStatus === 'RUNNING' && (!uncheckedDiscovery || lastStatus === 'RUNNING')
  );
  if (running.length < desiredCount) {
    return { verdict: 'waiting', reason: `${running.length} of ${desiredCount} new tasks started` };
  }
  if (hasHealthCheck && running.some(({ healthStatus }) => healthStatus !== 'HEALTHY')) {
    return { verdict: 'waiting', reason: 'a new task has not passed its container health check' };
  }
  const targets: ServingTarget[] = [];
  for (const task of running) {
    const ip = taskIp(task);
    for (const { targetGroupArn, containerName, containerPort } of loadBalancers) {
      if (ip) {
        targets.push({ targetGroupArn: targetGroupArn!, id: ip, port: containerPort! });
        continue;
      }
      // ECS reports the host port Docker mapped only once the container runs. Another port on the same instance is
      // another task's target.
      const instanceId = ec2InstanceIdOf(task);
      const hostPort = task.containers
        ?.find(({ name }) => name === containerName)
        ?.networkBindings?.find((binding) => binding.containerPort === containerPort)?.hostPort;
      if (!instanceId || !hostPort) {
        return { verdict: 'waiting', reason: 'the load balancer target of a new task is not known yet' };
      }
      targets.push({ targetGroupArn: targetGroupArn!, id: instanceId, port: hostPort });
    }
  }
  const instances = serviceRegistries.flatMap(({ registryArn }) =>
    running.map((task) => ({
      serviceId: registryArn!.split('/').at(-1)!,
      instanceId: task.taskArn!.split('/').at(-1)!
    }))
  );
  return { verdict: 'check', targets, instances };
};

/**
 * How long the waiter keeps the new targets healthy in every target group before it reports that the load balancer
 * sends them requests. Each load balancer node runs its own health checks, and no AWS API says when every node routes
 * to a target. Measured on 16 October 2026 behind an application load balancer in 41 deploys: on Fargate, the first
 * request reached the new task 1.1 to 2.7 seconds after an observer polling about once a second saw its target healthy;
 * on EC2, where that observer could not tell the old and new targets on one instance apart, 0.9 to 3.6 seconds. In 6
 * deploys that probed each load balancer node separately, every node routed to the new task within 3.0 seconds of the
 * last read that still showed the target unhealthy. The allowance starts when the waiter first sees every target
 * healthy.
 */
export const LOAD_BALANCER_ROUTING_ALLOWANCE_MS = 4000;

/**
 * How long the waiter keeps the new tasks discoverable in Cloud Map before it reports that API Gateway sends them
 * requests. An HTTP API's VPC link integration finds tasks with Cloud Map's `DiscoverInstances`, which returns the healthy
 * instances or, while none is healthy, all of them. ECS registers a task with a container health check as unhealthy and
 * reports it healthy to Cloud Map once the check passes, but Cloud Map applies that change seconds to a minute later.
 * So API Gateway usually starts sending requests to the new task once ECS deregisters the old one, before Cloud Map
 * reports the new one healthy. No AWS API says when API Gateway itself sees the change. Measured on 17 October 2026 in 30
 * rollouts on Fargate, 20 of them with a container health check: API Gateway sent the first request to the new task from 0.3
 * seconds before to 2.2 seconds after an observer polling `DiscoverInstances` about every 300 ms first saw it there. The
 * allowance starts when the waiter first sees every new task there.
 */
export const API_GATEWAY_ROUTING_ALLOWANCE_MS = 4000;

/**
 * What a rolling update waited for. Before the rollout completes, the old tasks still drain and stop in the background.
 * `new-targets-healthy`: every new task was a healthy target in every target group for the routing allowance.
 * `new-instances-discoverable`: API Gateway could discover every new task in Cloud Map for the routing allowance.
 * When unchecked discovery is allowed, the tasks are RUNNING but application health remains unknown.
 */
export type RollingUpdateFinish =
  | 'rollout-completed'
  | 'new-tasks-healthy'
  | 'new-targets-healthy'
  | 'new-instances-discoverable'
  | 'new-targets-healthy-and-instances-discoverable';

const groupBy = <T>(items: T[], key: (item: T) => string) =>
  items.reduce(
    (groups, item) => groups.set(key(item), [...(groups.get(key(item)) ?? []), item]),
    new Map<string, T[]>()
  );

/**
 * Why ECS gave up the deployment (its circuit breaker or a CloudWatch alarm rolled it back) or the service is gone, if
 * it did.
 */
const rolloutFailure = ({ services, failures }: DescribeServicesCommandOutput, deployment: Deployment) =>
  (deployment.rolloutState === DeploymentRolloutState.FAILED ? deployment.rolloutStateReason : undefined) ||
  failures?.find(({ reason }) => reason === 'MISSING')?.detail ||
  services?.find(({ status }) => status === 'DRAINING')?.status ||
  services?.find(({ status }) => status === 'INACTIVE')?.status;

/**
 * Another `UpdateService`, such as a rollback or a concurrent deploy, replaced the deployment before it finished. ECS
 * reads are eventually consistent: a stale snapshot can still show the previous deployment as PRIMARY, or lack this one.
 * Only a PRIMARY deployment created after this one proves the replacement.
 */
const supersession = ({ services }: DescribeServicesCommandOutput, deployment: Deployment) => {
  const primary = services?.[0]?.deployments?.find(({ status }) => status === 'PRIMARY');
  if (!primary?.createdAt || !deployment.createdAt || primary.id === deployment.id) return undefined;
  if (primary.createdAt.getTime() <= deployment.createdAt.getTime()) return undefined;
  return `Another deployment (${primary.id}) replaced this one before it finished, for example a rollback or another deploy of the same service.`;
};

const isAccessDenied = (error: unknown) =>
  error instanceof Error && /AccessDenied|UnauthorizedOperation|not authorized/i.test(`${error.name} ${error.message}`);

export class AwsEcs {
  readonly #createClient: () => ECSClient;
  readonly #createCodeDeployClient: () => CodeDeployClient;
  readonly #createElbClient: () => ElasticLoadBalancingV2Client;
  readonly #createServiceDiscoveryClient: () => ServiceDiscoveryClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    createCodeDeployClient,
    createElbClient,
    createServiceDiscoveryClient,
    getErrorHandler
  }: {
    createClient: () => ECSClient;
    createCodeDeployClient: () => CodeDeployClient;
    createElbClient: () => ElasticLoadBalancingV2Client;
    createServiceDiscoveryClient: () => ServiceDiscoveryClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#createCodeDeployClient = createCodeDeployClient;
    this.#createElbClient = createElbClient;
    this.#createServiceDiscoveryClient = createServiceDiscoveryClient;
    this.#getErrorHandler = getErrorHandler;
  }

  setAccountSetting = async (settingName: SettingName, settingValue: 'enabled' | 'disabled') => {
    const errorHandler = this.#getErrorHandler(
      `Unable to set ecs setting ${settingName} to desired value ${settingValue}`
    );
    return this.#createClient()
      .send(new PutAccountSettingDefaultCommand({ name: settingName, value: settingValue }))
      .catch(errorHandler);
  };

  getTaskDefinition = async ({ ecsTaskDefinitionFamily }: { ecsTaskDefinitionFamily: string }) => {
    const errorHandler = this.#getErrorHandler('Failed to get ECS task definition with tags.');
    return this.#createClient()
      .send(new DescribeTaskDefinitionCommand({ taskDefinition: ecsTaskDefinitionFamily, include: ['TAGS'] }))
      .catch(errorHandler);
  };

  getService = async ({ serviceArn }: { serviceArn: string }) => {
    const errorHandler = this.#getErrorHandler('Failed to get ECS Service information');
    const ecsClusterName = serviceArn.split('/')[1];
    const { services: [service] = [] } = await this.#createClient()
      .send(new DescribeServicesCommand({ services: [serviceArn], cluster: ecsClusterName }))
      .catch(errorHandler);
    return service;
  };

  registerTaskDefinition = async ({
    cloudformationEcsTaskDefinition
  }: {
    cloudformationEcsTaskDefinition: KnownCloudFormationResource<'AWS::ECS::TaskDefinition'>;
  }) => {
    const errorHandler = this.#getErrorHandler('Failed to register new ECS task definition.');
    const lowerCasedProps = toRegisterTaskDefinitionInput(cloudformationEcsTaskDefinition);
    return (await this.#createClient().send(new RegisterTaskDefinitionCommand(lowerCasedProps)).catch(errorHandler))
      .taskDefinition;
  };

  startCodeDeployUpdate = async (parameters: CreateDeploymentCommandInput) => {
    const errorHandler = this.#getErrorHandler('Failed to start the update of ECS service (using CodeDeploy).');
    return this.#createCodeDeployClient()
      .send(new CreateDeploymentCommand({ ...parameters }))
      .catch(errorHandler);
  };

  waitForCodeDeployUpdate = async ({ deploymentId }: { deploymentId: string }) => {
    const errorHandler = this.#getErrorHandler(`CodeDeploy ECS service deployment ${deploymentId} failed.`);

    await waitUntilDeploymentSuccessful(
      { client: this.#createCodeDeployClient(), maxWaitTime: 3600, minDelay: 3, maxDelay: 3 },
      { deploymentId }
    ).catch((error) => {
      let errorToReport = error;
      try {
        const parsedError = JSON.parse(`${error}`.slice(7));
        if (parsedError.result.reason.deploymentInfo.errorInformation) {
          errorToReport = new Error(
            `[${parsedError.result.reason.deploymentInfo.errorInformation.code}]: ${parsedError.result.reason.deploymentInfo.errorInformation.message}`
          );
        }
      } catch {}
      errorHandler(errorToReport);
    });
  };

  /** Returns the ID of the deployment the update started (the service's new primary deployment). */
  startRollingUpdate = async (parameters: UpdateServiceCommandInput) => {
    const errorHandler = this.#getErrorHandler('Failed to start the update of ECS service.');
    const { service } = await this.#createClient()
      .send(new UpdateServiceCommand({ ...parameters }))
      .catch(errorHandler);
    return { deploymentId: service?.deployments?.find(({ status }) => status === 'PRIMARY')?.id };
  };

  /**
   * Waits for the new tasks to meet the configured health/routing checks, or for ECS to finish the rollout. Pass the deployment `startRollingUpdate`
   * returned: without it the waiter gives ECS two seconds to make the new deployment primary and follows that one.
   */
  waitForRollingUpdate = async ({
    ecsServiceArn,
    deploymentId,
    allowUncheckedDiscovery = false
  }: {
    ecsServiceArn: string;
    deploymentId?: string;
    allowUncheckedDiscovery?: boolean;
  }): Promise<{ finishedWhen: RollingUpdateFinish }> => {
    const errorHandler = this.#getErrorHandler(`ECS service ${ecsServiceArn} failed to update.`);
    let targetDeploymentId = deploymentId;
    if (!targetDeploymentId) await wait(2000);
    const ecsClusterName = ecsServiceArn.split('/')[1];
    const waiterInput: DescribeServicesCommandInput = { services: [ecsServiceArn], cluster: ecsClusterName };
    // With early success (deferred cleanup), the service deployment succeeds once the new tasks are healthy, while
    // `rolloutState` stays IN_PROGRESS until the old tasks have drained and stopped. A service deployment's
    // target revision carries the ID of the deployment it rolls out. Services without early success, and callers
    // that may not read service deployments, keep waiting for `rolloutState`.
    let canReadServiceDeployments = true;
    const reachedEarlySuccess = async (ecsClient: ECSClient, deploymentId: string) => {
      if (!canReadServiceDeployments) return false;
      const revisionId = deploymentId.split('/').at(-1);
      try {
        const { serviceDeployments } = await ecsClient.send(
          new ListServiceDeploymentsCommand({ service: ecsServiceArn, cluster: ecsClusterName })
        );
        return (
          serviceDeployments?.find(({ targetServiceRevisionArn }) =>
            targetServiceRevisionArn?.endsWith(`/${revisionId}`)
          )?.status === 'SUCCESSFUL'
        );
      } catch {
        canReadServiceDeployments = false;
        return false;
      }
    };
    // The waiter reads the health signals that show the new tasks serve itself; see `planNewTasksServingChecks`. When
    // it cannot (no usable signal, or no permission to read one), ECS decides.
    let canCheckServing = true;
    const containerDefinitionsByTaskDefinition = new Map<string, ContainerDefinition[]>();
    const ec2InstanceIds = new Map<string, string>();
    /** Cloud Map service ID → the names `DiscoverInstances` takes. */
    const discoveryNames = new Map<string, { NamespaceName: string; ServiceName: string }>();
    const discoveryNamesOf = async (serviceId: string) => {
      let names = discoveryNames.get(serviceId);
      if (!names) {
        const client = this.#createServiceDiscoveryClient();
        const { Service } = await client.send(new GetServiceCommand({ Id: serviceId }));
        const { Namespace } = await client.send(new GetNamespaceCommand({ Id: Service?.NamespaceId }));
        // AWS appends a hash to the HTTP name when a namespace name was used before; `DiscoverInstances` takes that one.
        names = {
          NamespaceName: Namespace!.Properties?.HttpProperties?.HttpName ?? Namespace!.Name!,
          ServiceName: Service!.Name!
        };
        discoveryNames.set(serviceId, names);
      }
      return names;
    };
    /** The targets and instances the waiter last saw healthy and discoverable, and since when. */
    let ready: { key: string; since: number } | undefined;
    const newTasksServe = async (
      ecsClient: ECSClient,
      service: Service,
      deployment: Deployment,
      allowanceServed = false
    ): Promise<boolean> => {
      if (!canCheckServing) return false;
      if (!deployment.id || !deployment.taskDefinition) {
        canCheckServing = false;
        return false;
      }
      try {
        const taskArns: string[] = [];
        let nextToken: string | undefined;
        do {
          const page = await ecsClient.send(
            new ListTasksCommand({ cluster: ecsClusterName, startedBy: deployment.id, maxResults: 100, nextToken })
          );
          taskArns.push(...(page.taskArns ?? []));
          nextToken = page.nextToken;
        } while (nextToken);
        const describedTasks: Task[] = [];
        for (const batch of chunkArray(taskArns, 100)) {
          const { tasks = [], failures = [] } = await ecsClient.send(
            new DescribeTasksCommand({ cluster: ecsClusterName, tasks: batch })
          );
          const describedArns = new Set(tasks.map(({ taskArn }) => taskArn));
          if (failures.length || batch.some((arn) => !describedArns.has(arn))) {
            ready = undefined;
            return false;
          }
          describedTasks.push(...tasks);
        }
        const tasks = describedTasks.filter(
          ({ startedBy, taskDefinitionArn }) =>
            startedBy === deployment.id && taskDefinitionArn === deployment.taskDefinition
        );
        let containerDefinitions = containerDefinitionsByTaskDefinition.get(deployment.taskDefinition);
        if (!containerDefinitions) {
          const { taskDefinition } = await ecsClient.send(
            new DescribeTaskDefinitionCommand({ taskDefinition: deployment.taskDefinition })
          );
          containerDefinitions = taskDefinition?.containerDefinitions ?? [];
          containerDefinitionsByTaskDefinition.set(deployment.taskDefinition, containerDefinitions);
        }
        const unknownContainerInstances = [
          ...new Set(
            tasks
              .filter((task) => !taskIp(task) && task.containerInstanceArn)
              .map(({ containerInstanceArn }) => containerInstanceArn!)
              .filter((arn) => !ec2InstanceIds.has(arn))
          )
        ];
        if (unknownContainerInstances.length) {
          const { containerInstances = [] } = await ecsClient.send(
            new DescribeContainerInstancesCommand({
              cluster: ecsClusterName,
              containerInstances: unknownContainerInstances
            })
          );
          for (const { containerInstanceArn, ec2InstanceId } of containerInstances) {
            if (containerInstanceArn && ec2InstanceId) ec2InstanceIds.set(containerInstanceArn, ec2InstanceId);
          }
        }
        const plan = planNewTasksServingChecks({
          deployment,
          service,
          containerDefinitions,
          tasks,
          allowUncheckedDiscovery,
          ec2InstanceIdOf: ({ containerInstanceArn }) => ec2InstanceIds.get(containerInstanceArn ?? '')
        });
        if (plan.verdict !== 'check') {
          // A task that stops passing a check while the allowance runs must start it again once it recovers.
          ready = undefined;
          if (plan.verdict === 'undecidable') canCheckServing = false;
          return false;
        }
        const healthyTargetGroups = await Promise.all(
          [...groupBy(plan.targets, ({ targetGroupArn }) => targetGroupArn)].map(async ([targetGroupArn, targets]) => {
            const { TargetHealthDescriptions = [] } = await this.#createElbClient().send(
              new DescribeTargetHealthCommand({
                TargetGroupArn: targetGroupArn,
                Targets: targets.map(({ id, port }) => ({ Id: id, Port: port }))
              })
            );
            return targets.every(
              ({ id, port }) =>
                TargetHealthDescriptions.find(({ Target }) => Target?.Id === id && Target?.Port === port)?.TargetHealth
                  ?.State === 'healthy'
            );
          })
        );
        // The same call API Gateway makes: while no instance is healthy, it returns all of them.
        const discoverableRegistries = await Promise.all(
          [...groupBy(plan.instances, ({ serviceId }) => serviceId)].map(async ([serviceId, instances]) => {
            const { Instances = [] } = await this.#createServiceDiscoveryClient().send(
              new DiscoverInstancesCommand({
                ...(await discoveryNamesOf(serviceId)),
                HealthStatus: HealthStatusFilter.HEALTHY_OR_ELSE_ALL,
                MaxResults: 1000
              })
            );
            return instances.every(({ instanceId }) => Instances.some(({ InstanceId }) => InstanceId === instanceId));
          })
        );
        if (![...healthyTargetGroups, ...discoverableRegistries].every(Boolean)) {
          ready = undefined;
          return false;
        }
        const allowance = Math.max(
          plan.targets.length ? LOAD_BALANCER_ROUTING_ALLOWANCE_MS : 0,
          plan.instances.length ? API_GATEWAY_ROUTING_ALLOWANCE_MS : 0
        );
        if (!allowance) return true;
        newTargetsChecked = plan.targets.length > 0;
        newInstancesChecked = plan.instances.length > 0;
        const key = [
          ...plan.targets.map(({ targetGroupArn, id, port }) => `${targetGroupArn} ${id}:${port}`),
          ...plan.instances.map(({ serviceId, instanceId }) => `${serviceId} ${instanceId}`)
        ]
          .sort()
          .join(',');
        // A monotonic clock: the system clock can be stepped while the waiter runs.
        if (ready?.key !== key) ready = { key, since: performance.now() };
        else if (allowanceServed) return true;
        const allowanceLeft = ready.since + allowance - performance.now();
        if (allowanceLeft <= 0) return true;
        // Waiting out the allowance here instead of for later polls finishes the deploy as soon as it has passed.
        await wait(allowanceLeft);
        // ECS can roll the deployment back meanwhile (an alarm fired, say), or another deploy can replace it, while its
        // targets stay healthy and its tasks discoverable. The next poll then reports the failure.
        const serviceState = await ecsClient.send(new DescribeServicesCommand(waiterInput));
        const [currentService] = serviceState.services ?? [];
        const currentDeployment = currentService?.deployments?.find(({ id }) => id === deployment.id);
        if (
          !currentService ||
          !currentDeployment ||
          rolloutFailure(serviceState, currentDeployment) ||
          supersession(serviceState, currentDeployment)
        ) {
          return false;
        }
        return newTasksServe(ecsClient, currentService, currentDeployment, true);
      } catch (error) {
        // A transient error is retried at the next poll; a missing permission will not change.
        ready = undefined;
        if (isAccessDenied(error)) canCheckServing = false;
        return false;
      }
    };
    /** Whether the new tasks were shown to serve through load balancer targets, not only their own health. */
    let newTargetsChecked = false;
    /** Whether API Gateway could discover the new tasks in Cloud Map. */
    let newInstancesChecked = false;
    let finishedWhen: RollingUpdateFinish = 'rollout-completed';
    /** The waiter's deployment as last read, once a read has shown it. */
    let seenDeployment: Deployment | undefined;
    const waiterResult = await createWaiter(
      // Every second of polling delay is a second added to the deploy; a few cheap read calls per second are fine.
      { client: this.#createClient(), maxWaitTime: 3600, minDelay: 1, maxDelay: 2 },
      waiterInput,
      async (ecsClient, input) => {
        const serviceState = await ecsClient.send(new DescribeServicesCommand(input));
        const targetedDeployment = targetDeploymentId
          ? serviceState.services[0].deployments.find(({ id }) => id === targetDeploymentId)
          : serviceState.services[0].deployments.find(({ status }) => status === 'PRIMARY');

        // A deployment the waiter has seen leaves the list after another one replaced it, or seems to in a stale read.
        const replaced = !targetedDeployment && seenDeployment && supersession(serviceState, seenDeployment);
        if (replaced) {
          return {
            state: WaiterState.FAILURE,
            reason: `ECS service ${ecsServiceArn} failed to update. Reason: ${replaced}`
          };
        }
        if (!targetedDeployment) {
          return {
            state: WaiterState.RETRY,
            reason: `ECS service ${ecsServiceArn} update in progress.`
          };
        }
        targetDeploymentId = targetedDeployment.id;
        seenDeployment = targetedDeployment;

        const failure = rolloutFailure(serviceState, targetedDeployment);

        if (failure) {
          return {
            state: WaiterState.FAILURE,
            reason: `ECS service ${ecsServiceArn} failed to update. Reason: ${failure}`
          };
        }

        // A rolling deployment reaches its task count well before ECS finishes validating it: the
        // new tasks still have to pass load balancer and Cloud Map health reporting, and the circuit
        // breaker can still roll the deployment back afterwards. Succeeding on the task count alone
        // reported a healthy update for a rollout that was in fact stuck IN_PROGRESS, and it never
        // succeeded at all for a service scaled to zero. `rolloutState` is the ECS-controller signal
        // that the deployment converged; it is omitted only for services behind a Classic Load
        // Balancer, which Stacktape never creates, so fall back to the task count if it is absent.
        const converged = targetedDeployment.rolloutState
          ? targetedDeployment.rolloutState === DeploymentRolloutState.COMPLETED
          : targetedDeployment.runningCount === targetedDeployment.desiredCount;
        const usesEarlySuccess = !!serviceState.services[0].deploymentConfiguration?.earlySuccessCriteria?.enable;
        if (converged) {
          return {
            state: WaiterState.SUCCESS,
            reason: `ECS service ${ecsServiceArn} updated successfully.`
          };
        }
        // Checked after convergence: a deployment that completed and was then replaced did finish.
        const superseded = supersession(serviceState, targetedDeployment);
        if (superseded) {
          return {
            state: WaiterState.FAILURE,
            reason: `ECS service ${ecsServiceArn} failed to update. Reason: ${superseded}`
          };
        }
        // ECS early success counts a task reached through Cloud Map as healthy before API Gateway sends it requests, so
        // it decides only when the waiter cannot read the health signals itself.
        if (
          (await newTasksServe(ecsClient, serviceState.services[0], targetedDeployment)) ||
          (!canCheckServing &&
            !allowUncheckedDiscovery &&
            usesEarlySuccess &&
            (await reachedEarlySuccess(ecsClient, targetDeploymentId)))
        ) {
          finishedWhen =
            newTargetsChecked && newInstancesChecked
              ? 'new-targets-healthy-and-instances-discoverable'
              : newTargetsChecked
                ? 'new-targets-healthy'
                : newInstancesChecked
                  ? 'new-instances-discoverable'
                  : 'new-tasks-healthy';
          return {
            state: WaiterState.SUCCESS,
            reason: `ECS service ${ecsServiceArn} meets the new task completion checks.`
          };
        }
        return {
          state: WaiterState.RETRY,
          reason: `ECS service ${ecsServiceArn} update in progress.`
        };
      }
    );
    if (waiterResult.state !== WaiterState.SUCCESS) {
      throw errorHandler(new Error(waiterResult.reason));
    }
    return { finishedWhen };
  };

  startExecSession = async (startSessionInput: ExecuteCommandCommandInput) => {
    const errorHandler = this.#getErrorHandler('Unable to start container session');
    const { session } = await this.#createClient()
      .send(new ExecuteCommandCommand(startSessionInput))
      .catch((error) => {
        if (
          `${error}`.includes(
            'The execute command failed because execute command was not enabled when the task was run'
          )
        ) {
          return errorHandler(
            new Error(
              'Container sessions are not enabled for this workload. Please set `enableRemoteSessions: true` on your container service definition.'
            )
          );
        }
        return errorHandler(error);
      });
    return toSessionManagerSession(session);
  };

  listTasks = async ({ ecsClusterName, desiredStatus }: { ecsClusterName: string; desiredStatus?: DesiredStatus }) => {
    const taskArnsList: string[] = [];
    let { nextToken, taskArns } = await this.#createClient().send(
      new ListTasksCommand({ cluster: ecsClusterName, desiredStatus })
    );
    taskArnsList.push(...taskArns);
    while (nextToken) {
      ({ nextToken, taskArns } = await this.#createClient().send(
        new ListTasksCommand({ cluster: ecsClusterName, nextToken, desiredStatus })
      ));
      taskArnsList.push(...taskArns);
    }
    return (
      await Promise.all(
        chunkArray(taskArnsList, 100).map(async (chunk) =>
          this.#createClient().send(new DescribeTasksCommand({ tasks: chunk, cluster: ecsClusterName }))
        )
      )
    )
      .flat()
      .map(({ tasks }) => tasks)
      .flat();
  };
}

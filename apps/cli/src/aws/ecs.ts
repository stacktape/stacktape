import type { KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { CreateDeploymentCommandInput, CodeDeployClient } from '@aws-sdk/client-codedeploy';
import { CreateDeploymentCommand, waitUntilDeploymentSuccessful } from '@aws-sdk/client-codedeploy';
import type {
  ContainerDefinition,
  Deployment,
  DescribeServicesCommandInput,
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
import { GetInstancesHealthStatusCommand } from '@aws-sdk/client-servicediscovery';
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
/** A Cloud Map instance (ECS registers each task under its task ID) that must be healthy. */
type ServingInstance = { serviceId: string; instanceId: string };

/**
 * Without a load balancer and without a container health check on an essential container, ECS counts a task as healthy
 * once it has been RUNNING for 40 seconds (see `MinimumHealthyPercent` in the ECS service `DeploymentConfiguration`).
 */
export const UNCHECKED_TASK_HEALTHY_AFTER_MS = 40_000;

/**
 * A load balancer sends the first request to a target 1.5 to 2.7 seconds after DescribeTargetHealth reports it healthy
 * (measured on an application load balancer). The waiter's own polling covers most of that; without this wait it
 * reported a deploy done up to 1.5 seconds before the first request reached the new version.
 */
const LOAD_BALANCER_ROUTING_DELAY_MS = 1000;

export type NewTasksServingPlan =
  /** The new tasks cannot be shown to serve from health signals; ECS decides when the deployment is done. */
  | { verdict: 'undecidable'; reason: string }
  | { verdict: 'waiting'; reason: string }
  /** Every new task runs and passed its container health check; these targets and instances must be healthy too. */
  | { verdict: 'check'; targets: ServingTarget[]; instances: ServingInstance[] };

const taskIp = (task: Task) =>
  task.attachments
    ?.find(({ type }) => type === 'ElasticNetworkInterface')
    ?.details?.find(({ name }) => name === 'privateIPv4Address')?.value;

/**
 * Which health signals prove that the new tasks of a rolling deployment serve traffic.
 *
 * A task behind a target group serves once the target group reports it healthy: the load balancer has started routing
 * requests to it. Tasks reached through Cloud Map (an HTTP API Gateway integration) or Service Connect are registered
 * as soon as they run, before the application may listen, so for them a container health check on an essential
 * container is the signal. Without one, a Cloud Map task or a task no traffic reaches counts as healthy the way ECS
 * counts it: after 40 seconds in RUNNING, so a task that crashes on start is never reported as serving. ECS waits for
 * the same moment before it stops the old tasks, but its rollout then also waits for them to drain and stop, which took
 * another two minutes. Service Connect without a health check is left to ECS. With EC2 bridge networking the
 * target is the task's EC2 instance and the host port Docker mapped to the container port.
 *
 * A healthy task is not yet reached through API Gateway: measured on Fargate, API Gateway sent it the first request 10
 * to 20 seconds later. Cloud Map reports the instance healthy about 30 seconds after the task, by which time API
 * Gateway always reached it, so the instance's Cloud Map health is the signal. ECS early success counts the task
 * alone, which reported such deploys done before any request reached the new version.
 */
export const planNewTasksServingChecks = ({
  deployment,
  service,
  containerDefinitions,
  tasks,
  runningForMs,
  ec2InstanceIdOf = () => undefined
}: {
  deployment: Pick<Deployment, 'serviceConnectConfiguration'>;
  /** A new deployment starts with no desired task and grows to the service's count, so the service's count is used. */
  service: Pick<Service, 'desiredCount' | 'loadBalancers' | 'serviceRegistries'>;
  /** The deployment's task definition. */
  containerDefinitions: ContainerDefinition[];
  /** The tasks the deployment started that are meant to run. */
  tasks: Task[];
  /** How long the waiter has seen a task RUNNING. Measured locally, so a skewed clock cannot shorten it. */
  runningForMs: (task: Task) => number;
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
  const usesServiceConnect = !!deployment.serviceConnectConfiguration?.enabled;
  const reachedWithoutTargetGroup = serviceRegistries.length > 0 || usesServiceConnect || !loadBalancers.length;
  if (usesServiceConnect && !hasHealthCheck) {
    return { verdict: 'undecidable', reason: 'no health check shows when a new task is ready' };
  }
  // ECS moves a task from ACTIVATING to RUNNING a few seconds after its load balancer target turned healthy, and the
  // load balancer routes requests to it in between, so a task counts once its containers started.
  const running = tasks.filter(
    ({ lastStatus, desiredStatus }) =>
      (lastStatus === 'ACTIVATING' || lastStatus === 'RUNNING') && desiredStatus === 'RUNNING'
  );
  if (running.length < desiredCount) {
    return { verdict: 'waiting', reason: `${running.length} of ${desiredCount} new tasks running` };
  }
  if (hasHealthCheck && running.some(({ healthStatus }) => healthStatus !== 'HEALTHY')) {
    return { verdict: 'waiting', reason: 'a new task has not passed its container health check' };
  }
  if (
    reachedWithoutTargetGroup &&
    !hasHealthCheck &&
    running.some((task) => runningForMs(task) < UNCHECKED_TASK_HEALTHY_AFTER_MS)
  ) {
    return { verdict: 'waiting', reason: 'a new task without a health check has not run for 40 seconds' };
  }
  const targets: ServingTarget[] = [];
  for (const task of running) {
    const ip = taskIp(task);
    for (const { targetGroupArn, containerName, containerPort } of loadBalancers) {
      if (ip) {
        targets.push({ targetGroupArn: targetGroupArn!, id: ip, port: containerPort! });
        continue;
      }
      const instanceId = ec2InstanceIdOf(task);
      const hostPort = task.containers
        ?.find(({ name }) => name === containerName)
        ?.networkBindings?.find((binding) => binding.containerPort === containerPort)?.hostPort;
      if (!instanceId || !hostPort) {
        return { verdict: 'undecidable', reason: 'the load balancer target of a new task is unknown' };
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

const groupBy = <T>(items: T[], key: (item: T) => string) =>
  items.reduce(
    (groups, item) => groups.set(key(item), [...(groups.get(key(item)) ?? []), item]),
    new Map<string, T[]>()
  );

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
   * Waits until the new tasks serve, or until ECS finishes the rollout. Pass the deployment `startRollingUpdate`
   * returned: without it the waiter gives ECS two seconds to make the new deployment primary and follows that one.
   */
  waitForRollingUpdate = async ({ ecsServiceArn, deploymentId }: { ecsServiceArn: string; deploymentId?: string }) => {
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
    // A load balancer starts routing requests to a new task as soon as its target is healthy, but ECS notices that,
    // and reports early success, only tens of seconds later. The waiter reads the same health signals itself; see
    // `planNewTasksServingChecks`. When it cannot (no usable signal, or no permission to read one), ECS decides.
    let canCheckServing = true;
    const containerDefinitionsByTaskDefinition = new Map<string, ContainerDefinition[]>();
    const ec2InstanceIds = new Map<string, string>();
    const firstSeenRunning = new Map<string, number>();
    const runningForMs = (task: Task) => {
      const seenAt = firstSeenRunning.get(task.taskArn!);
      return seenAt === undefined ? 0 : performance.now() - seenAt;
    };
    const newTasksServe = async (ecsClient: ECSClient, service: Service, deployment: Deployment) => {
      if (!canCheckServing) return false;
      if (!deployment.id || !deployment.taskDefinition) {
        canCheckServing = false;
        return false;
      }
      try {
        const { taskArns = [] } = await ecsClient.send(
          new ListTasksCommand({ cluster: ecsClusterName, startedBy: deployment.id, maxResults: 100 })
        );
        const tasks = taskArns.length
          ? ((await ecsClient.send(new DescribeTasksCommand({ cluster: ecsClusterName, tasks: taskArns }))).tasks ?? [])
          : [];
        let containerDefinitions = containerDefinitionsByTaskDefinition.get(deployment.taskDefinition);
        if (!containerDefinitions) {
          const { taskDefinition } = await ecsClient.send(
            new DescribeTaskDefinitionCommand({ taskDefinition: deployment.taskDefinition })
          );
          containerDefinitions = taskDefinition?.containerDefinitions ?? [];
          containerDefinitionsByTaskDefinition.set(deployment.taskDefinition, containerDefinitions);
        }
        for (const { taskArn, lastStatus } of tasks) {
          if (lastStatus === 'RUNNING' && taskArn && !firstSeenRunning.has(taskArn)) {
            firstSeenRunning.set(taskArn, performance.now());
          }
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
          runningForMs,
          ec2InstanceIdOf: ({ containerInstanceArn }) => ec2InstanceIds.get(containerInstanceArn ?? '')
        });
        if (plan.verdict === 'undecidable') {
          canCheckServing = false;
          return false;
        }
        if (plan.verdict === 'waiting') return false;
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
        const healthyRegistries = await Promise.all(
          [...groupBy(plan.instances, ({ serviceId }) => serviceId)].map(async ([serviceId, instances]) => {
            const { Status = {} } = await this.#createServiceDiscoveryClient().send(
              new GetInstancesHealthStatusCommand({
                ServiceId: serviceId,
                Instances: instances.map(({ instanceId }) => instanceId)
              })
            );
            return instances.every(({ instanceId }) => Status[instanceId] === 'HEALTHY');
          })
        );
        const serve = [...healthyTargetGroups, ...healthyRegistries].every(Boolean);
        if (serve && plan.targets.length) await wait(LOAD_BALANCER_ROUTING_DELAY_MS);
        return serve;
      } catch (error) {
        // A transient error is retried at the next poll; a missing permission will not change.
        if (isAccessDenied(error)) canCheckServing = false;
        return false;
      }
    };
    let oldTasksMayStillRun = false;
    const waiterResult = await createWaiter(
      // Every second of polling delay is a second added to the deploy; a few cheap read calls per second are fine.
      { client: this.#createClient(), maxWaitTime: 3600, minDelay: 1, maxDelay: 2 },
      waiterInput,
      async (ecsClient, input) => {
        const serviceState = await ecsClient.send(new DescribeServicesCommand(input));
        const targetedDeployment = targetDeploymentId
          ? serviceState.services[0].deployments.find(({ id }) => id === targetDeploymentId)
          : serviceState.services[0].deployments.find(({ status }) => status === 'PRIMARY');

        if (!targetedDeployment) {
          return {
            state: WaiterState.RETRY,
            reason: `ECS service ${ecsServiceArn} update in progress.`
          };
        }
        targetDeploymentId = targetedDeployment.id;

        const failure =
          (targetedDeployment.rolloutState === DeploymentRolloutState.FAILED
            ? targetedDeployment.rolloutStateReason
            : undefined) ||
          serviceState.failures?.find(({ reason }) => reason === 'MISSING')?.detail ||
          serviceState.services?.find(({ status }) => status === 'DRAINING')?.status ||
          serviceState.services?.find(({ status }) => status === 'INACTIVE')?.status;

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
        // ECS early success counts a task reached through Cloud Map as healthy before API Gateway sends it requests, so
        // it decides only when the waiter cannot read the health signals itself.
        if (
          (await newTasksServe(ecsClient, serviceState.services[0], targetedDeployment)) ||
          (!canCheckServing && usesEarlySuccess && (await reachedEarlySuccess(ecsClient, targetDeploymentId)))
        ) {
          oldTasksMayStillRun = true;
          return {
            state: WaiterState.SUCCESS,
            reason: `ECS service ${ecsServiceArn} serves the new version.`
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
    return { oldTasksMayStillRun };
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

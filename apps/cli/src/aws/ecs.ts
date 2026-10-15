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
 * as soon as they run, before the application may listen, so for them only a container health check on an essential
 * container is a signal. The same goes for a service no traffic reaches. Without such a signal, or with `instance`
 * targets (EC2 bridge networking), the decision is ECS's.
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
  tasks
}: {
  deployment: Pick<Deployment, 'serviceConnectConfiguration'>;
  /** A new deployment starts with no desired task and grows to the service's count, so the service's count is used. */
  service: Pick<Service, 'desiredCount' | 'loadBalancers' | 'serviceRegistries'>;
  /** The deployment's task definition. */
  containerDefinitions: ContainerDefinition[];
  /** The tasks the deployment started that are meant to run. */
  tasks: Task[];
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
  if (reachedWithoutTargetGroup && !hasHealthCheck) {
    return { verdict: 'undecidable', reason: 'no health check shows when a new task is ready' };
  }
  const running = tasks.filter(
    ({ lastStatus, desiredStatus }) => lastStatus === 'RUNNING' && desiredStatus === 'RUNNING'
  );
  if (running.length < desiredCount) {
    return { verdict: 'waiting', reason: `${running.length} of ${desiredCount} new tasks running` };
  }
  if (hasHealthCheck && running.some(({ healthStatus }) => healthStatus !== 'HEALTHY')) {
    return { verdict: 'waiting', reason: 'a new task has not passed its container health check' };
  }
  const targets: ServingTarget[] = [];
  for (const task of running) {
    const ip = taskIp(task);
    if (loadBalancers.length && !ip) {
      return { verdict: 'undecidable', reason: 'the load balancer targets are instances, not task IPs' };
    }
    for (const { targetGroupArn, containerPort } of loadBalancers) {
      targets.push({ targetGroupArn: targetGroupArn!, id: ip!, port: containerPort! });
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

  startRollingUpdate = async (parameters: UpdateServiceCommandInput) => {
    const errorHandler = this.#getErrorHandler('Failed to start the update of ECS service.');
    await this.#createClient()
      .send(new UpdateServiceCommand({ ...parameters }))
      .catch(errorHandler);
  };

  waitForRollingUpdate = async ({ ecsServiceArn }: { ecsServiceArn: string }) => {
    const errorHandler = this.#getErrorHandler(`ECS service ${ecsServiceArn} failed to update.`);
    let targetDeploymentId: string;
    await wait(2000);
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
        const plan = planNewTasksServingChecks({ deployment, service, containerDefinitions, tasks });
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
        return [...healthyTargetGroups, ...healthyRegistries].every(Boolean);
      } catch (error) {
        // A transient error is retried at the next poll; a missing permission will not change.
        if (isAccessDenied(error)) canCheckServing = false;
        return false;
      }
    };
    let oldTasksMayStillRun = false;
    const waiterResult = await createWaiter(
      { client: this.#createClient(), maxWaitTime: 3600, minDelay: 3, maxDelay: 3 },
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

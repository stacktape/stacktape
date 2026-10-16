import { describe, expect, test } from 'bun:test';
import type { CodeDeployClient } from '@aws-sdk/client-codedeploy';
import type { ECSClient, Task } from '@aws-sdk/client-ecs';
import {
  DescribeContainerInstancesCommand,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  DesiredStatus,
  ListServiceDeploymentsCommand,
  ListTasksCommand
} from '@aws-sdk/client-ecs';
import type {
  ElasticLoadBalancingV2Client,
  TargetHealthDescription,
  TargetHealthStateEnum
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { DescribeTargetHealthCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import type { ServiceDiscoveryClient } from '@aws-sdk/client-servicediscovery';
import { GetInstancesHealthStatusCommand } from '@aws-sdk/client-servicediscovery';
import {
  AwsEcs,
  type NewTasksServingPlan,
  planNewTasksServingChecks,
  targetGroupServesOnlyNewTasks
} from '../../src/aws/ecs';

type EcsSend = ECSClient['send'];
type CodeDeploySend = CodeDeployClient['send'];
type ElbSend = ElasticLoadBalancingV2Client['send'];
type ServiceDiscoverySend = ServiceDiscoveryClient['send'];

const refuse = (async () => {
  throw new Error('This test does not expect this client to be called.');
}) as never;

const ecsWith = ({
  ecsSend,
  codeDeploySend = (async () => ({})) as CodeDeploySend,
  elbSend = refuse as ElbSend,
  serviceDiscoverySend = refuse as ServiceDiscoverySend
}: {
  ecsSend: EcsSend;
  codeDeploySend?: CodeDeploySend;
  elbSend?: ElbSend;
  serviceDiscoverySend?: ServiceDiscoverySend;
}) =>
  new AwsEcs({
    createClient: () => ({ send: ecsSend }) as ECSClient,
    createCodeDeployClient: () => ({ send: codeDeploySend }) as CodeDeployClient,
    createElbClient: () => ({ send: elbSend }) as ElasticLoadBalancingV2Client,
    createServiceDiscoveryClient: () => ({ send: serviceDiscoverySend }) as ServiceDiscoveryClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

const TARGET_GROUP = 'arn:aws:elasticloadbalancing:eu-west-1:123456789999:targetgroup/api/1';
const REGISTRY = 'arn:aws:servicediscovery:eu-west-1:123456789999:service/srv-api';
const TASK_DEFINITION = 'arn:aws:ecs:eu-west-1:123456789999:task-definition/api:2';
const newTask = (id: string, overrides: Partial<Task> = {}): Task => ({
  taskArn: `arn:aws:ecs:eu-west-1:123456789999:task/application/${id}`,
  lastStatus: 'RUNNING',
  desiredStatus: 'RUNNING',
  healthStatus: 'UNKNOWN',
  attachments: [
    {
      type: 'ElasticNetworkInterface',
      details: [{ name: 'privateIPv4Address', value: `10.0.0.${id.charCodeAt(0)}` }]
    }
  ],
  ...overrides
});
const ipOfTask = (task: Task) => task.attachments![0]!.details![0]!.value!;

describe('AWS ECS operations', () => {
  test('paginates task ARNs and describes them in ECS-sized batches', async () => {
    const firstPage = Array.from({ length: 150 }, (_, index) => `arn:task/${index}`);
    const secondPage = Array.from({ length: 51 }, (_, index) => `arn:task/${index + 150}`);
    const ecs = ecsWith({
      ecsSend: (async (command: ListTasksCommand | DescribeTasksCommand) => {
        if (command instanceof ListTasksCommand) {
          return command.input.nextToken ? { taskArns: secondPage } : { nextToken: 'page-2', taskArns: firstPage };
        }
        if ((command.input.tasks?.length ?? 0) > 100) throw new Error('ECS refuses more than 100 tasks');
        return { tasks: command.input.tasks?.map((taskArn) => ({ taskArn })) };
      }) as EcsSend
    });

    const tasks = await ecs.listTasks({ ecsClusterName: 'application', desiredStatus: DesiredStatus.RUNNING });

    expect(tasks).toHaveLength(201);
    expect(tasks.at(0)?.taskArn).toBe('arn:task/0');
    expect(tasks.at(-1)?.taskArn).toBe('arn:task/200');
  });

  test('waits for the rolling deployment to converge, not just to reach its task count', async () => {
    // A rolling deployment reports runningCount === desiredCount while ECS is still validating the
    // new tasks against load balancer and Cloud Map health. Treating that as success reported a
    // healthy update for a rollout that was stuck IN_PROGRESS and that the circuit breaker could
    // still roll back.
    const serviceArn = 'arn:aws:ecs:eu-west-1:123456789999:service/application/api';
    const rolloutStates = ['IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED'];
    let polls = 0;
    let serviceDeploymentReads = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: DescribeServicesCommand | ListServiceDeploymentsCommand) => {
        if (command instanceof ListServiceDeploymentsCommand) {
          serviceDeploymentReads += 1;
          return { serviceDeployments: [] };
        }
        expect(command.input).toEqual({ services: [serviceArn], cluster: 'application' });
        const rolloutState = rolloutStates[Math.min(polls, rolloutStates.length - 1)];
        polls += 1;
        return {
          services: [
            {
              status: 'ACTIVE',
              deployments: [{ id: 'ecs-svc/1', status: 'PRIMARY', desiredCount: 1, runningCount: 1, rolloutState }]
            }
          ]
        };
      }) as EcsSend
    });

    await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn });

    expect(polls).toBe(rolloutStates.length);
    // Without early success the service deployment status is not consulted.
    expect(serviceDeploymentReads).toBe(0);
  }, 30_000);

  test('finishes when the service deployment meets early success while old tasks still drain', async () => {
    // With deferred cleanup, ECS marks the service deployment SUCCESSFUL once the new tasks are healthy. The legacy
    // rolloutState stays IN_PROGRESS until the old tasks have stopped, which is the wait early success removes.
    const serviceArn = 'arn:aws:ecs:eu-west-1:123456789999:service/application/api';
    const revision = (id: string) => `arn:aws:ecs:eu-west-1:123456789999:service-revision/application/api/${id}`;
    const statuses = ['IN_PROGRESS', 'SUCCESSFUL'];
    let listCalls = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: DescribeServicesCommand | ListServiceDeploymentsCommand) => {
        if (command instanceof ListServiceDeploymentsCommand) {
          expect(command.input).toEqual({ service: serviceArn, cluster: 'application' });
          const status = statuses[Math.min(listCalls, statuses.length - 1)];
          listCalls += 1;
          return {
            serviceDeployments: [
              { targetServiceRevisionArn: revision('2'), status },
              { targetServiceRevisionArn: revision('1'), status: 'SUCCESSFUL' }
            ]
          };
        }
        return {
          services: [
            {
              status: 'ACTIVE',
              deploymentConfiguration: { earlySuccessCriteria: { enable: true } },
              deployments: [
                { id: 'ecs-svc/2', status: 'PRIMARY', desiredCount: 1, runningCount: 1, rolloutState: 'IN_PROGRESS' },
                { id: 'ecs-svc/1', status: 'ACTIVE', desiredCount: 0, runningCount: 1, rolloutState: 'COMPLETED' }
              ]
            }
          ]
        };
      }) as EcsSend
    });

    await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn });

    expect(listCalls).toBe(statuses.length);
  }, 30_000);

  test('keeps waiting for the rollout when service deployments cannot be read', async () => {
    const serviceArn = 'arn:aws:ecs:eu-west-1:123456789999:service/application/api';
    const rolloutStates = ['IN_PROGRESS', 'COMPLETED'];
    let polls = 0;
    let listCalls = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: DescribeServicesCommand | ListServiceDeploymentsCommand) => {
        if (command instanceof ListServiceDeploymentsCommand) {
          listCalls += 1;
          throw new Error('AccessDeniedException: not authorized to perform ecs:ListServiceDeployments');
        }
        const rolloutState = rolloutStates[Math.min(polls, rolloutStates.length - 1)];
        polls += 1;
        return {
          services: [
            {
              status: 'ACTIVE',
              deploymentConfiguration: { earlySuccessCriteria: { enable: true } },
              deployments: [{ id: 'ecs-svc/1', status: 'PRIMARY', rolloutState }]
            }
          ]
        };
      }) as EcsSend
    });

    await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn });

    expect(polls).toBe(rolloutStates.length);
    expect(listCalls).toBe(1);
  }, 30_000);

  test('fails a rolling deployment the circuit breaker rolled back, and accepts a converged scale to zero', async () => {
    const serviceArn = 'arn:aws:ecs:eu-west-1:123456789999:service/application/api';
    const describing = (deployment: Record<string, unknown>) =>
      ecsWith({
        ecsSend: (async () => ({
          services: [{ status: 'ACTIVE', deployments: [{ id: 'ecs-svc/1', status: 'PRIMARY', ...deployment }] }]
        })) as EcsSend
      });

    const rolledBack = describing({
      desiredCount: 1,
      runningCount: 1,
      rolloutState: 'FAILED',
      rolloutStateReason: 'ECS deployment circuit breaker: task failed to start.'
    });
    await expect(rolledBack.waitForRollingUpdate({ ecsServiceArn: serviceArn })).rejects.toThrow(
      `ECS service ${serviceArn} failed to update.`
    );

    // A service scaled to zero converges with no running task; the previous task-count condition
    // could never be met and the waiter ran to its one-hour limit.
    const scaledToZero = describing({ desiredCount: 0, runningCount: 0, rolloutState: 'COMPLETED' });
    await scaledToZero.waitForRollingUpdate({ ecsServiceArn: serviceArn });
  }, 30_000);

  test('preserves the actionable hint when ECS Exec was not enabled for a task', async () => {
    const ecs = ecsWith({
      ecsSend: (async () => {
        throw new Error('The execute command failed because execute command was not enabled when the task was run');
      }) as EcsSend
    });

    try {
      await ecs.startExecSession({ cluster: 'application', command: '/bin/sh', interactive: true, task: 'task-1' });
      throw new Error('Expected ECS Exec to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Unable to start container session');
      expect((error as Error).cause).toBeInstanceOf(Error);
      expect(((error as Error).cause as Error).message).toContain('Please set `enableRemoteSessions: true`');
    }
  });
});

describe('which signals show that the new tasks of a rolling deployment serve', () => {
  const behindTargetGroup = {
    desiredCount: 2,
    loadBalancers: [{ targetGroupArn: TARGET_GROUP, containerName: 'api', containerPort: 3000 }]
  };
  const throughCloudMap = {
    desiredCount: 2,
    serviceRegistries: [{ registryArn: REGISTRY, containerName: 'api', containerPort: 3000 }]
  };
  const withoutHealthCheck = [{ name: 'api', essential: true }];
  const withHealthCheck = [{ name: 'api', essential: true, healthCheck: { command: ['CMD', 'true'] } }];
  const sidecarHealthCheckOnly = [
    { name: 'api', essential: true },
    { name: 'collector', essential: false, healthCheck: { command: ['CMD', 'true'] } }
  ];
  const deployment = {};
  const a = newTask('a');
  const b = newTask('b');
  const bridged = (id: string, containerInstanceArn: string, hostPort: number) =>
    newTask(id, {
      attachments: [],
      containerInstanceArn,
      containers: [{ name: 'api', networkBindings: [{ containerPort: 3000, hostPort }] }]
    });

  test.each<{ name: string; plan: Parameters<typeof planNewTasksServingChecks>[0]; expected: NewTasksServingPlan }>([
    {
      name: 'behind a target group, every running task must be a healthy target',
      plan: { deployment, service: behindTargetGroup, containerDefinitions: withoutHealthCheck, tasks: [a, b] },
      expected: {
        verdict: 'check',
        targets: [
          { targetGroupArn: TARGET_GROUP, id: ipOfTask(a), port: 3000 },
          { targetGroupArn: TARGET_GROUP, id: ipOfTask(b), port: 3000 }
        ],
        instances: []
      }
    },
    {
      name: 'a task still pending keeps the deployment waiting',
      plan: {
        deployment,
        service: behindTargetGroup,
        containerDefinitions: withoutHealthCheck,
        tasks: [a, newTask('b', { lastStatus: 'PENDING' })]
      },
      expected: { verdict: 'waiting', reason: '1 of 2 new tasks running' }
    },
    {
      name: 'a task still activating counts once its target is healthy',
      plan: {
        deployment,
        service: behindTargetGroup,
        containerDefinitions: withoutHealthCheck,
        tasks: [a, newTask('b', { lastStatus: 'ACTIVATING' })]
      },
      expected: {
        verdict: 'check',
        targets: [
          { targetGroupArn: TARGET_GROUP, id: ipOfTask(a), port: 3000 },
          { targetGroupArn: TARGET_GROUP, id: ipOfTask(b), port: 3000 }
        ],
        instances: []
      }
    },
    {
      name: 'a stopping task does not count as running',
      plan: {
        deployment,
        service: behindTargetGroup,
        containerDefinitions: withoutHealthCheck,
        tasks: [a, newTask('b', { desiredStatus: 'STOPPED' })]
      },
      expected: { verdict: 'waiting', reason: '1 of 2 new tasks running' }
    },
    {
      name: 'a container health check must pass even behind a target group',
      plan: {
        deployment,
        service: behindTargetGroup,
        containerDefinitions: withHealthCheck,
        tasks: [newTask('a', { healthStatus: 'HEALTHY' }), b]
      },
      expected: { verdict: 'waiting', reason: 'a new task has not passed its container health check' }
    },
    {
      // A running task may still be initializing, and may crash before it ever listens.
      name: 'through Cloud Map without a health check, nothing shows readiness and ECS decides',
      plan: { deployment, service: throughCloudMap, containerDefinitions: withoutHealthCheck, tasks: [a, b] },
      expected: { verdict: 'undecidable', reason: 'no health check shows when a new task is ready' }
    },
    {
      name: 'a health check on a non-essential sidecar says nothing about the application',
      plan: { deployment, service: throughCloudMap, containerDefinitions: sidecarHealthCheckOnly, tasks: [a, b] },
      expected: { verdict: 'undecidable', reason: 'no health check shows when a new task is ready' }
    },
    {
      name: 'Service Connect without a health check is left to ECS',
      plan: {
        deployment: { ...deployment, serviceConnectConfiguration: { enabled: true } },
        service: { desiredCount: 2 },
        containerDefinitions: withoutHealthCheck,
        tasks: [a, b]
      },
      expected: { verdict: 'undecidable', reason: 'no health check shows when a new task is ready' }
    },
    {
      name: 'through Cloud Map, healthy tasks must also be healthy Cloud Map instances',
      plan: {
        deployment,
        service: throughCloudMap,
        containerDefinitions: withHealthCheck,
        tasks: [newTask('a', { healthStatus: 'HEALTHY' }), newTask('b', { healthStatus: 'HEALTHY' })]
      },
      expected: {
        verdict: 'check',
        targets: [],
        instances: [
          { serviceId: 'srv-api', instanceId: 'a' },
          { serviceId: 'srv-api', instanceId: 'b' }
        ]
      }
    },
    {
      name: 'Service Connect relies on the container health check alone',
      plan: {
        deployment: { ...deployment, serviceConnectConfiguration: { enabled: true } },
        service: { desiredCount: 2 },
        containerDefinitions: withHealthCheck,
        tasks: [newTask('a', { healthStatus: 'HEALTHY' }), newTask('b', { healthStatus: 'HEALTHY' })]
      },
      expected: { verdict: 'check', targets: [], instances: [] }
    },
    {
      name: 'a service without traffic and without a health check is left to ECS',
      plan: { deployment, service: { desiredCount: 2 }, containerDefinitions: withoutHealthCheck, tasks: [a, b] },
      expected: { verdict: 'undecidable', reason: 'no health check shows when a new task is ready' }
    },
    {
      name: 'with EC2 bridge networking, the target is the instance and the host port mapped to the container port',
      plan: {
        deployment,
        service: behindTargetGroup,
        containerDefinitions: withoutHealthCheck,
        tasks: [bridged('a', 'i-1', 32768), bridged('b', 'i-2', 32769)],
        ec2InstanceIdOf: ({ containerInstanceArn }) => containerInstanceArn
      },
      expected: {
        verdict: 'check',
        targets: [
          { targetGroupArn: TARGET_GROUP, id: 'i-1', port: 32768 },
          { targetGroupArn: TARGET_GROUP, id: 'i-2', port: 32769 }
        ],
        instances: []
      }
    },
    {
      name: 'a bridged task whose instance is not known yet keeps the deployment waiting',
      plan: {
        deployment,
        service: behindTargetGroup,
        containerDefinitions: withoutHealthCheck,
        tasks: [bridged('a', 'i-1', 32768), bridged('b', 'i-2', 32769)]
      },
      expected: { verdict: 'waiting', reason: 'the load balancer target of a new task is not known yet' }
    },
    {
      // ECS adds the network bindings once the container runs, which can be a poll after the task does.
      name: 'a bridged task without network bindings yet keeps the deployment waiting',
      plan: {
        deployment,
        service: behindTargetGroup,
        containerDefinitions: withoutHealthCheck,
        tasks: [bridged('a', 'i-1', 32768), newTask('b', { attachments: [], containerInstanceArn: 'i-2' })],
        ec2InstanceIdOf: ({ containerInstanceArn }) => containerInstanceArn
      },
      expected: { verdict: 'waiting', reason: 'the load balancer target of a new task is not known yet' }
    },
    {
      name: 'a service scaled to zero is left to ECS',
      plan: { deployment, service: { ...behindTargetGroup, desiredCount: 0 }, containerDefinitions: [], tasks: [] },
      expected: { verdict: 'undecidable', reason: 'the service runs no task' }
    }
  ])('$name', ({ plan, expected }) => {
    expect(planNewTasksServingChecks(plan)).toEqual(expected);
  });
});

describe('when a target group sends every new request to the new tasks', () => {
  const target = (Id: string, State: TargetHealthStateEnum): TargetHealthDescription => ({
    Target: { Id, Port: 3000 },
    TargetHealth: { State }
  });
  const newTargets = [{ id: '10.0.0.2', port: 3000 }];

  test.each<{ name: string; descriptions: TargetHealthDescription[]; expected: boolean }>([
    {
      name: 'not while an old target is still healthy, even though the new one is',
      descriptions: [target('10.0.0.1', 'healthy'), target('10.0.0.2', 'healthy')],
      expected: false
    },
    {
      name: 'once the old target drains',
      descriptions: [target('10.0.0.1', 'draining'), target('10.0.0.2', 'healthy')],
      expected: true
    },
    { name: 'once the old target is gone', descriptions: [target('10.0.0.2', 'healthy')], expected: true },
    {
      // A load balancer node that does not see the new target healthy yet fails open and routes to every target.
      name: 'not while an old target fails its health checks but is still registered',
      descriptions: [target('10.0.0.1', 'unhealthy'), target('10.0.0.2', 'healthy')],
      expected: false
    },
    {
      name: 'once the old target of a network load balancer drains while unhealthy',
      descriptions: [target('10.0.0.1', 'unhealthy.draining'), target('10.0.0.2', 'healthy')],
      expected: true
    },
    {
      name: 'not while the new target is still in its initial health checks',
      descriptions: [target('10.0.0.1', 'draining'), target('10.0.0.2', 'initial')],
      expected: false
    },
    {
      name: 'not while another target registers, since it receives requests once healthy',
      descriptions: [target('10.0.0.3', 'initial'), target('10.0.0.2', 'healthy')],
      expected: false
    },
    {
      name: 'not with health checks turned off, since every registered target receives requests',
      descriptions: [target('10.0.0.1', 'unavailable'), target('10.0.0.2', 'healthy')],
      expected: false
    },
    {
      name: 'not when the new target is on another port of the same address',
      descriptions: [{ Target: { Id: '10.0.0.2', Port: 8080 }, TargetHealth: { State: 'healthy' } }],
      expected: false
    }
  ])('$name', ({ descriptions, expected }) => {
    expect(targetGroupServesOnlyNewTasks(newTargets, descriptions)).toBe(expected);
  });
});

describe('a rolling update that finishes once the new tasks serve', () => {
  const serviceArn = 'arn:aws:ecs:eu-west-1:123456789999:service/application/api';
  const describedService = {
    services: [
      {
        status: 'ACTIVE',
        desiredCount: 1,
        deploymentConfiguration: { earlySuccessCriteria: { enable: true } },
        loadBalancers: [{ targetGroupArn: TARGET_GROUP, containerName: 'api', containerPort: 3000 }],
        serviceRegistries: [{ registryArn: REGISTRY, containerName: 'api', containerPort: 3000 }],
        deployments: [
          {
            id: 'ecs-svc/2',
            status: 'PRIMARY',
            taskDefinition: TASK_DEFINITION,
            desiredCount: 1,
            runningCount: 1,
            rolloutState: 'IN_PROGRESS'
          },
          { id: 'ecs-svc/1', status: 'ACTIVE', desiredCount: 0, runningCount: 1, rolloutState: 'COMPLETED' }
        ]
      }
    ]
  };
  const task = newTask('a', { healthStatus: 'HEALTHY', startedBy: 'ecs-svc/2' });
  const ecsSend = (async (command: unknown) => {
    if (command instanceof DescribeServicesCommand) return describedService;
    if (command instanceof ListTasksCommand) {
      expect(command.input).toEqual({ cluster: 'application', startedBy: 'ecs-svc/2', maxResults: 100 });
      return { taskArns: [task.taskArn] };
    }
    if (command instanceof DescribeTasksCommand) return { tasks: [task] };
    // ECS early success counts the task healthy before Cloud Map does; the waiter must not take its word for it.
    if (command instanceof ListServiceDeploymentsCommand) {
      return {
        serviceDeployments: [
          { targetServiceRevisionArn: 'arn:service-revision/application/api/2', status: 'SUCCESSFUL' }
        ]
      };
    }
    if (command instanceof DescribeTaskDefinitionCommand) {
      return {
        taskDefinition: {
          containerDefinitions: [{ name: 'api', essential: true, healthCheck: { command: ['CMD', 'true'] } }]
        }
      };
    }
    throw new Error(`Unexpected ECS call ${(command as object).constructor.name}`);
  }) as EcsSend;

  test('finishes when the target and the Cloud Map instance are healthy while the old task still runs', async () => {
    // ECS keeps the rollout IN_PROGRESS (and, with early success, the service deployment too) until the old task has
    // drained and stopped, well after the load balancer stopped sending it requests.
    const targetStates = ['initial', 'healthy', 'healthy'];
    const instanceStates = ['UNHEALTHY', 'HEALTHY'];
    let targetReads = 0;
    let instanceReads = 0;
    const ecs = ecsWith({
      ecsSend,
      elbSend: (async (command: DescribeTargetHealthCommand) => {
        expect(command).toBeInstanceOf(DescribeTargetHealthCommand);
        expect(command.input).toEqual({ TargetGroupArn: TARGET_GROUP });
        const State = targetStates[targetReads++];
        return {
          TargetHealthDescriptions: [
            { Target: { Id: '10.0.0.1', Port: 3000 }, TargetHealth: { State: 'draining' } },
            { Target: { Id: ipOfTask(task), Port: 3000 }, TargetHealth: { State } }
          ]
        };
      }) as ElbSend,
      serviceDiscoverySend: (async (command: GetInstancesHealthStatusCommand) => {
        expect(command.input).toEqual({ ServiceId: 'srv-api', Instances: ['a'] });
        const status = targetReads > 1 ? instanceStates[instanceReads++] : 'UNHEALTHY';
        return { Status: { a: status } };
      }) as ServiceDiscoverySend
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({ oldTasksMayStillRun: true });
    expect(targetReads).toBe(3);
    expect(instanceReads).toBe(2);
  }, 30_000);

  test('waits until the load balancer can no longer send requests to the old task', async () => {
    // DescribeTargetHealth reported a new target healthy up to 2.7 seconds before the load balancer sent it the first
    // request, so a healthy new target next to a healthy old one does not show that the new version serves.
    const albOnly = {
      services: [{ ...describedService.services[0], serviceRegistries: [], deploymentConfiguration: {} }]
    };
    const oldTargetStates = ['healthy', 'healthy', 'healthy', 'draining'];
    let targetReads = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) return albOnly;
        if (command instanceof DescribeTaskDefinitionCommand) {
          return { taskDefinition: { containerDefinitions: [{ name: 'api', essential: true }] } };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      elbSend: (async () => {
        const State = oldTargetStates[targetReads++];
        return {
          TargetHealthDescriptions: [
            { Target: { Id: '10.0.0.1', Port: 3000 }, TargetHealth: { State } },
            { Target: { Id: ipOfTask(task), Port: 3000 }, TargetHealth: { State: 'healthy' } }
          ]
        };
      }) as ElbSend
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({ oldTasksMayStillRun: true });
    expect(targetReads).toBe(oldTargetStates.length);
  }, 30_000);

  test('fails a task that runs for a minute and then crashes before it ever served', async () => {
    // Behind an HTTP API without a container health check, the task registers in Cloud Map as soon as it runs. Having
    // run for 40 seconds (when ECS counts such a task toward the healthy minimum) does not show that the application
    // listens; this one initializes for a minute and exits, and the circuit breaker rolls the deployment back.
    const throughCloudMap = {
      ...describedService.services[0],
      loadBalancers: [],
      deploymentConfiguration: {}
    };
    const [primary, ...rest] = describedService.services[0]!.deployments;
    let polls = 0;
    // Each poll appears to come a minute after the previous one.
    const realNow = performance.now;
    let now = realNow.call(performance);
    performance.now = () => (now += 60_000);
    try {
      const ecs = ecsWith({
        ecsSend: (async (command: unknown) => {
          if (command instanceof DescribeServicesCommand) {
            polls += 1;
            const crashed = polls >= 4;
            return {
              services: [
                {
                  ...throughCloudMap,
                  deployments: [
                    crashed
                      ? { ...primary, rolloutState: 'FAILED', rolloutStateReason: 'tasks failed to start' }
                      : primary,
                    ...rest
                  ]
                }
              ]
            };
          }
          if (command instanceof DescribeTaskDefinitionCommand) {
            return { taskDefinition: { containerDefinitions: [{ name: 'api', essential: true }] } };
          }
          return ecsSend(command as never);
        }) as EcsSend,
        serviceDiscoverySend: (async () => ({ Status: { a: 'HEALTHY' } })) as ServiceDiscoverySend
      });

      await expect(ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).rejects.toThrow(
        `ECS service ${serviceArn} failed to update.`
      );
      expect(polls).toBe(4);
    } finally {
      performance.now = realNow;
    }
  }, 30_000);

  test('checks an EC2 bridge-network target once ECS reports its host port, a poll after the task', async () => {
    const containerInstanceArn = 'arn:aws:ecs:eu-west-1:123456789999:container-instance/application/ci-1';
    const bridged = {
      services: [
        {
          ...describedService.services[0],
          serviceRegistries: [],
          deploymentConfiguration: {},
          deployments: describedService.services[0]!.deployments
        }
      ]
    };
    let polls = 0;
    let targetReads = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) {
          polls += 1;
          // ECS would finish the rollout much later; the waiter must not need it.
          if (polls < 6) return bridged;
          const [primary, ...rest] = bridged.services[0]!.deployments;
          return {
            services: [{ ...bridged.services[0], deployments: [{ ...primary, rolloutState: 'COMPLETED' }, ...rest] }]
          };
        }
        if (command instanceof DescribeTasksCommand) {
          const bindings = polls >= 2 ? [{ containerPort: 3000, hostPort: 32768 }] : undefined;
          return {
            tasks: [
              newTask('a', {
                lastStatus: polls >= 2 ? 'RUNNING' : 'ACTIVATING',
                attachments: [],
                containerInstanceArn,
                containers: [{ name: 'api', networkBindings: bindings }]
              })
            ]
          };
        }
        if (command instanceof DescribeContainerInstancesCommand) {
          return { containerInstances: [{ containerInstanceArn, ec2InstanceId: 'i-1' }] };
        }
        if (command instanceof DescribeTaskDefinitionCommand) {
          return { taskDefinition: { containerDefinitions: [{ name: 'api', essential: true }] } };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      elbSend: (async () => {
        targetReads += 1;
        return {
          TargetHealthDescriptions: [
            { Target: { Id: 'i-1', Port: 32770 }, TargetHealth: { State: 'draining' } },
            { Target: { Id: 'i-1', Port: 32768 }, TargetHealth: { State: 'healthy' } }
          ]
        };
      }) as ElbSend
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({ oldTasksMayStillRun: true });
    expect(polls).toBe(2);
    expect(targetReads).toBe(1);
  }, 30_000);

  test('waits for the rollout when it may not read target health', async () => {
    let polls = 0;
    let targetReads = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) {
          polls += 1;
          const [primary, ...rest] = describedService.services[0]!.deployments;
          return {
            services: [
              {
                ...describedService.services[0],
                deploymentConfiguration: {},
                deployments: [{ ...primary, rolloutState: polls < 3 ? 'IN_PROGRESS' : 'COMPLETED' }, ...rest]
              }
            ]
          };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      elbSend: (async () => {
        targetReads += 1;
        throw Object.assign(new Error('User is not authorized to perform: elasticloadbalancing:DescribeTargetHealth'), {
          name: 'AccessDenied'
        });
      }) as ElbSend,
      serviceDiscoverySend: (async () => ({ Status: { a: 'HEALTHY' } })) as ServiceDiscoverySend
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({ oldTasksMayStillRun: false });
    expect(polls).toBe(3);
    expect(targetReads).toBe(1);
  }, 30_000);
});

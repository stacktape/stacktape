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
import type { ElasticLoadBalancingV2Client } from '@aws-sdk/client-elastic-load-balancing-v2';
import { DescribeTargetHealthCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import type { ServiceDiscoveryClient } from '@aws-sdk/client-servicediscovery';
import {
  DiscoverInstancesCommand,
  GetInstancesHealthStatusCommand,
  GetNamespaceCommand,
  GetServiceCommand
} from '@aws-sdk/client-servicediscovery';
import {
  API_GATEWAY_ROUTING_ALLOWANCE_MS,
  AwsEcs,
  LOAD_BALANCER_ROUTING_ALLOWANCE_MS,
  type NewTasksServingPlan,
  planNewTasksServingChecks
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
const DISCOVERY_NAMES = { NamespaceName: 'app-stage-private-namespace', ServiceName: 'ApiPort3000Discovery' };
/**
 * Cloud Map as ECS and API Gateway see it. `discoverable(read)` lists the instances `DiscoverInstances` returns, as API
 * Gateway calls it; the health status Cloud Map reports for the new instance `a` is HEALTHY from the start, as it can be
 * long before API Gateway may route to it. `DiscoverInstances` finds the namespace by its HTTP name, which AWS can make
 * differ from its name.
 */
const cloudMapWith = (
  discoverable: (read: number) => string[],
  namespace: { Name: string; HttpName: string } = {
    Name: DISCOVERY_NAMES.NamespaceName,
    HttpName: DISCOVERY_NAMES.NamespaceName
  }
) => {
  const discoverReads: number[] = [];
  const send = (async (command: unknown) => {
    if (command instanceof GetServiceCommand) {
      expect(command.input).toEqual({ Id: 'srv-api' });
      return { Service: { Id: 'srv-api', Name: DISCOVERY_NAMES.ServiceName, NamespaceId: 'ns-app' } };
    }
    if (command instanceof GetNamespaceCommand) {
      expect(command.input).toEqual({ Id: 'ns-app' });
      return {
        Namespace: {
          Id: 'ns-app',
          Name: namespace.Name,
          Properties: { HttpProperties: { HttpName: namespace.HttpName } }
        }
      };
    }
    if (command instanceof GetInstancesHealthStatusCommand) return { Status: { a: 'HEALTHY', old: 'HEALTHY' } };
    if (command instanceof DiscoverInstancesCommand) {
      if (command.input.NamespaceName !== namespace.HttpName) {
        throw Object.assign(new Error('Namespace not found'), { name: 'NamespaceNotFound' });
      }
      expect(command.input).toEqual({
        NamespaceName: namespace.HttpName,
        ServiceName: DISCOVERY_NAMES.ServiceName,
        HealthStatus: 'HEALTHY_OR_ELSE_ALL',
        MaxResults: 1000
      });
      const instances = discoverable(discoverReads.length);
      discoverReads.push(performance.now());
      return { Instances: instances.map((InstanceId) => ({ InstanceId })) };
    }
    throw new Error(`Unexpected Cloud Map call ${(command as object).constructor.name}`);
  }) as ServiceDiscoverySend;
  return { send, discoverReads };
};
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
      name: 'a task not started yet keeps the deployment waiting',
      plan: { deployment, service: behindTargetGroup, containerDefinitions: withoutHealthCheck, tasks: [a] },
      expected: { verdict: 'waiting', reason: '1 of 2 new tasks started' }
    },
    {
      // ECS reports the task ACTIVATING or RUNNING seconds after the load balancer reported its target healthy.
      name: 'a task ECS still reports pending counts once its target is healthy',
      plan: {
        deployment,
        service: behindTargetGroup,
        containerDefinitions: withoutHealthCheck,
        tasks: [newTask('a', { lastStatus: 'PENDING' }), newTask('b', { lastStatus: 'ACTIVATING' })]
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
      expected: { verdict: 'waiting', reason: '1 of 2 new tasks started' }
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
            rolloutState: 'IN_PROGRESS',
            createdAt: new Date('2026-10-17T10:05:00Z')
          },
          {
            id: 'ecs-svc/1',
            status: 'ACTIVE',
            desiredCount: 0,
            runningCount: 1,
            rolloutState: 'COMPLETED',
            createdAt: new Date('2026-10-17T10:00:00Z')
          }
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

  test('finishes when the target is healthy and the Cloud Map instance discoverable while the old task still runs', async () => {
    // ECS keeps the rollout IN_PROGRESS (and, with early success, the service deployment too) until the old task has
    // drained and stopped, well after the load balancer started sending requests to the new one.
    const targetStates = ['initial', 'healthy'];
    let targetReads = 0;
    const cloudMap = cloudMapWith((read) => (read === 0 ? ['old'] : ['a']));
    const ecs = ecsWith({
      ecsSend,
      elbSend: (async (command: DescribeTargetHealthCommand) => {
        expect(command).toBeInstanceOf(DescribeTargetHealthCommand);
        expect(command.input).toEqual({ TargetGroupArn: TARGET_GROUP, Targets: [{ Id: ipOfTask(task), Port: 3000 }] });
        const State = targetStates[targetReads++] ?? 'healthy';
        return { TargetHealthDescriptions: [{ Target: { Id: ipOfTask(task), Port: 3000 }, TargetHealth: { State } }] };
      }) as ElbSend,
      serviceDiscoverySend: cloudMap.send
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'new-targets-healthy-and-instances-discoverable'
    });
    // The second read finds both ready; the third confirms them after the routing allowance.
    expect(targetReads).toBe(3);
    expect(cloudMap.discoverReads.length).toBe(3);
  }, 30_000);

  // Behind an HTTP API, API Gateway finds the tasks with DiscoverInstances. Cloud Map can report the new task healthy
  // while DiscoverInstances still returns only the old one, and API Gateway then sends every request to the old task.
  const behindHttpApi = (
    discoverable: (read: number) => string[],
    deploymentAt: (poll: number) => Record<string, unknown> = () => ({}),
    namespace?: Parameters<typeof cloudMapWith>[1]
  ) => {
    const service = { ...describedService.services[0], loadBalancers: [] };
    const [primary, ...rest] = service.deployments;
    let polls = 0;
    const cloudMap = cloudMapWith(discoverable, namespace);
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) {
          polls += 1;
          return { services: [{ ...service, deployments: [{ ...primary, ...deploymentAt(polls) }, ...rest] }] };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      serviceDiscoverySend: cloudMap.send
    });
    return { ecs, discoverReads: cloudMap.discoverReads, polls: () => polls };
  };

  test('finishes behind an HTTP API once API Gateway can discover the new task, plus the routing allowance', async () => {
    const { ecs, discoverReads } = behindHttpApi((read) => (read < 2 ? ['old'] : ['a']));

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'new-instances-discoverable'
    });
    const waited = performance.now() - discoverReads[2]!;
    // Two reads still return the old task; the fourth confirms the new one after the allowance.
    expect(discoverReads.length).toBe(4);
    // Timers may fire a millisecond early.
    expect(waited).toBeGreaterThanOrEqual(API_GATEWAY_ROUTING_ALLOWANCE_MS - 10);
    expect(waited).toBeLessThan(API_GATEWAY_ROUTING_ALLOWANCE_MS + 1000);
  }, 30_000);

  test('discovers the new task in a namespace whose HTTP name differs from its name', async () => {
    // A reused namespace name gets a hash appended to its HTTP name. Asking for the plain name finds no namespace, and
    // the deploy would wait for ECS to complete the rollout.
    const { ecs, discoverReads } = behindHttpApi(
      () => ['a'],
      (poll) => (poll >= 4 ? { rolloutState: 'COMPLETED' } : {}),
      { Name: DISCOVERY_NAMES.NamespaceName, HttpName: `${DISCOVERY_NAMES.NamespaceName}-c3f1a2` }
    );

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'new-instances-discoverable'
    });
    expect(discoverReads.length).toBe(2);
  }, 30_000);

  test('restarts the API Gateway allowance when the new task is no longer discoverable', async () => {
    const { ecs, discoverReads } = behindHttpApi((read) => (read === 1 ? ['old'] : ['a']));

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'new-instances-discoverable'
    });
    expect(discoverReads.length).toBe(4);
    expect(performance.now() - discoverReads[2]!).toBeGreaterThanOrEqual(API_GATEWAY_ROUTING_ALLOWANCE_MS - 10);
  }, 30_000);

  test('fails an HTTP API deployment ECS rolls back during the API Gateway allowance', async () => {
    const { ecs, polls } = behindHttpApi(
      () => ['a'],
      (poll) => (poll === 1 ? {} : { rolloutState: 'FAILED', rolloutStateReason: 'Alarm api-5xx in ALARM' })
    );

    await expect(ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).rejects.toThrow(
      `ECS service ${serviceArn} failed to update.`
    );
    // The re-read after the allowance sees the rollback; the next poll reports it.
    expect(polls()).toBe(3);
  }, 30_000);

  // DescribeTargetHealth reported a new target healthy up to 2.7 seconds before the load balancer sent it the first
  // request, so the waiter gives the load balancer nodes time to route to it.
  const behindLoadBalancer = ({
    targetGroupArns,
    stateOf
  }: {
    targetGroupArns: string[];
    stateOf: (targetGroupArn: string, read: number) => string;
  }) => {
    const reads: { targetGroupArn: string; at: number; state: string }[] = [];
    const service = {
      ...describedService.services[0],
      serviceRegistries: [],
      deploymentConfiguration: {},
      loadBalancers: targetGroupArns.map((targetGroupArn) => ({
        targetGroupArn,
        containerName: 'api',
        containerPort: 3000
      }))
    };
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) return { services: [service] };
        if (command instanceof DescribeTaskDefinitionCommand) {
          return { taskDefinition: { containerDefinitions: [{ name: 'api', essential: true }] } };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      elbSend: (async (command: DescribeTargetHealthCommand) => {
        const targetGroupArn = command.input.TargetGroupArn!;
        const state = stateOf(targetGroupArn, reads.filter((read) => read.targetGroupArn === targetGroupArn).length);
        reads.push({ targetGroupArn, at: performance.now(), state });
        return {
          TargetHealthDescriptions: [{ Target: { Id: ipOfTask(task), Port: 3000 }, TargetHealth: { State: state } }]
        };
      }) as ElbSend
    });
    /** When the waiter first saw the new target healthy in a target group, for good. */
    const healthySince = (targetGroupArn: string) => {
      const ofGroup = reads.filter((read) => read.targetGroupArn === targetGroupArn);
      return ofGroup[ofGroup.findLastIndex(({ state }) => state !== 'healthy') + 1]!.at;
    };
    return { ecs, reads, healthySince };
  };

  test('keeps waiting until the routing allowance has passed since the new target turned healthy', async () => {
    const { ecs, reads, healthySince } = behindLoadBalancer({
      targetGroupArns: [TARGET_GROUP],
      // Healthy, then briefly not, which restarts the allowance.
      stateOf: (_, read) => (read === 0 || read === 2 ? 'initial' : 'healthy')
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'new-targets-healthy'
    });
    const waited = performance.now() - healthySince(TARGET_GROUP);
    expect(reads.map(({ state }) => state)).toEqual(['initial', 'healthy', 'initial', 'healthy', 'healthy']);
    // Timers may fire a millisecond early.
    expect(waited).toBeGreaterThanOrEqual(LOAD_BALANCER_ROUTING_ALLOWANCE_MS - 10);
    // The waiter finishes when the allowance ends, not at a later poll.
    expect(waited).toBeLessThan(LOAD_BALANCER_ROUTING_ALLOWANCE_MS + 1000);
  }, 30_000);

  test('keeps waiting while the new target is healthy in only one of the target groups', async () => {
    const secondTargetGroup = 'arn:aws:elasticloadbalancing:eu-west-1:123456789999:targetgroup/api-internal/2';
    const { ecs, reads, healthySince } = behindLoadBalancer({
      targetGroupArns: [TARGET_GROUP, secondTargetGroup],
      stateOf: (targetGroupArn, read) => (targetGroupArn === TARGET_GROUP || read >= 2 ? 'healthy' : 'initial')
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'new-targets-healthy'
    });
    expect(reads.filter(({ targetGroupArn }) => targetGroupArn === secondTargetGroup).length).toBe(4);
    expect(performance.now() - healthySince(secondTargetGroup)).toBeGreaterThanOrEqual(
      LOAD_BALANCER_ROUTING_ALLOWANCE_MS - 10
    );
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

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'new-targets-healthy'
    });
    // The third read checks the deployment again after the routing allowance.
    expect(polls).toBe(3);
    // The second read confirms the target after the routing allowance.
    expect(targetReads).toBe(2);
  }, 30_000);

  test("does not count another task's healthy target on the same EC2 instance", async () => {
    const containerInstanceArn = 'arn:aws:ecs:eu-west-1:123456789999:container-instance/application/ci-1';
    const service = { ...describedService.services[0], serviceRegistries: [], deploymentConfiguration: {} };
    const [primary, ...rest] = service.deployments;
    let polls = 0;
    const targetsAsked: unknown[] = [];
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) {
          polls += 1;
          const rolloutState = polls < 4 ? 'IN_PROGRESS' : 'COMPLETED';
          return { services: [{ ...service, deployments: [{ ...primary, rolloutState }, ...rest] }] };
        }
        if (command instanceof DescribeTasksCommand) {
          return {
            tasks: [
              newTask('a', {
                attachments: [],
                containerInstanceArn,
                containers: [{ name: 'api', networkBindings: [{ containerPort: 3000, hostPort: 32769 }] }]
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
      elbSend: (async (command: DescribeTargetHealthCommand) => {
        targetsAsked.push(command.input.Targets);
        // The old task on the same instance is healthy on its own host port; the new one is not yet.
        return {
          TargetHealthDescriptions: [
            { Target: { Id: 'i-1', Port: 32768 }, TargetHealth: { State: 'healthy' } },
            { Target: { Id: 'i-1', Port: 32769 }, TargetHealth: { State: 'initial' } }
          ]
        };
      }) as ElbSend
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'rollout-completed'
    });
    expect(polls).toBe(4);
    expect(targetsAsked).toEqual(Array.from({ length: 3 }, () => [{ Id: 'i-1', Port: 32769 }]));
  }, 30_000);

  test('fails a deployment ECS rolls back during the routing allowance while its targets stay healthy', async () => {
    // A CloudWatch alarm (or the circuit breaker) can fail the deployment after its targets turned healthy. ECS then
    // starts a rollback, and the new targets stay healthy until it replaces them.
    const service = { ...describedService.services[0], serviceRegistries: [], deploymentConfiguration: {} };
    const [primary, ...rest] = service.deployments;
    let polls = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) {
          polls += 1;
          if (polls === 1) return { services: [service] };
          const rolledBack = { ...primary, rolloutState: 'FAILED', rolloutStateReason: 'Alarm api-5xx in ALARM' };
          return { services: [{ ...service, deployments: [rolledBack, ...rest] }] };
        }
        if (command instanceof DescribeTaskDefinitionCommand) {
          return { taskDefinition: { containerDefinitions: [{ name: 'api', essential: true }] } };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      elbSend: (async () => ({
        TargetHealthDescriptions: [{ Target: { Id: ipOfTask(task), Port: 3000 }, TargetHealth: { State: 'healthy' } }]
      })) as ElbSend
    });

    await expect(ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).rejects.toThrow(
      `ECS service ${serviceArn} failed to update.`
    );
    expect(polls).toBe(3);
  }, 30_000);

  // A manual rollback or a concurrent deploy calls UpdateService again: the waiter's deployment turns ACTIVE while
  // another one becomes PRIMARY, and its new targets stay healthy until ECS replaces them.
  const supersededAfter = (primaryPolls: number, targetStateOf: (read: number) => string) => {
    const service = { ...describedService.services[0], serviceRegistries: [], deploymentConfiguration: {} };
    const [primary, previous] = service.deployments;
    const replacement = {
      ...primary,
      id: 'ecs-svc/3',
      taskDefinition: `${TASK_DEFINITION}-rollback`,
      createdAt: new Date('2026-10-17T10:06:00Z')
    };
    let polls = 0;
    let targetReads = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) {
          polls += 1;
          if (polls <= primaryPolls) return { services: [service] };
          return { services: [{ ...service, deployments: [replacement, { ...primary, status: 'ACTIVE' }, previous] }] };
        }
        if (command instanceof DescribeTaskDefinitionCommand) {
          return { taskDefinition: { containerDefinitions: [{ name: 'api', essential: true }] } };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      elbSend: (async () => ({
        TargetHealthDescriptions: [
          { Target: { Id: ipOfTask(task), Port: 3000 }, TargetHealth: { State: targetStateOf(targetReads++) } }
        ]
      })) as ElbSend
    });
    return { ecs, polls: () => polls, targetReads: () => targetReads };
  };

  test('fails a deployment another deployment replaces during the routing allowance', async () => {
    const { ecs, polls } = supersededAfter(1, () => 'healthy');

    const error = await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn }).catch((error: Error) => error);
    expect((error as Error).cause).toEqual(
      new Error(
        `ECS service ${serviceArn} failed to update. Reason: Another deployment (ecs-svc/3) replaced this one before it finished, for example a rollback or another deploy of the same service.`
      )
    );
    // The re-read after the allowance sees the replacement; the next poll reports it.
    expect(polls()).toBe(3);
  }, 30_000);

  test('fails a deployment another deployment replaces before its targets turn healthy', async () => {
    const { ecs, polls, targetReads } = supersededAfter(1, (read) => (read === 0 ? 'initial' : 'healthy'));

    await expect(ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).rejects.toThrow(
      `ECS service ${serviceArn} failed to update.`
    );
    expect(polls()).toBe(2);
    expect(targetReads()).toBe(1);
  }, 30_000);

  test('keeps waiting when a stale read shows only the previous deployment', async () => {
    // ECS reads are eventually consistent: a read can return the service as it was before the update.
    const service = { ...describedService.services[0], serviceRegistries: [], deploymentConfiguration: {} };
    const [, previous] = service.deployments;
    let polls = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) {
          polls += 1;
          if (polls === 2) return { services: [{ ...service, deployments: [{ ...previous, status: 'PRIMARY' }] }] };
          return { services: [service] };
        }
        if (command instanceof DescribeTaskDefinitionCommand) {
          return { taskDefinition: { containerDefinitions: [{ name: 'api', essential: true }] } };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      elbSend: (async () => ({
        TargetHealthDescriptions: [
          { Target: { Id: ipOfTask(task), Port: 3000 }, TargetHealth: { State: polls === 1 ? 'initial' : 'healthy' } }
        ]
      })) as ElbSend
    });

    await expect(ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).resolves.toEqual({
      finishedWhen: 'new-targets-healthy'
    });
    // The fourth read is the re-read after the routing allowance.
    expect(polls).toBe(4);
  }, 30_000);

  test('restarts the routing allowance when a new task fails its health check during it', async () => {
    const service = { ...describedService.services[0], serviceRegistries: [], deploymentConfiguration: {} };
    const healthStates = ['HEALTHY', 'UNHEALTHY'];
    const taskReads: { at: number; healthStatus: string }[] = [];
    const ecs = ecsWith({
      ecsSend: (async (command: unknown) => {
        if (command instanceof DescribeServicesCommand) return { services: [service] };
        if (command instanceof DescribeTasksCommand) {
          const healthStatus = healthStates[taskReads.length] ?? 'HEALTHY';
          taskReads.push({ at: performance.now(), healthStatus });
          return { tasks: [{ ...task, healthStatus }] };
        }
        return ecsSend(command as never);
      }) as EcsSend,
      elbSend: (async () => ({
        TargetHealthDescriptions: [{ Target: { Id: ipOfTask(task), Port: 3000 }, TargetHealth: { State: 'healthy' } }]
      })) as ElbSend
    });

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'new-targets-healthy'
    });
    const recoveredAt = taskReads[2]!.at;
    expect(taskReads.map(({ healthStatus }) => healthStatus)).toEqual(['HEALTHY', 'UNHEALTHY', 'HEALTHY', 'HEALTHY']);
    // Timers may fire a millisecond early.
    expect(performance.now() - recoveredAt).toBeGreaterThanOrEqual(LOAD_BALANCER_ROUTING_ALLOWANCE_MS - 10);
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

    expect(await ecs.waitForRollingUpdate({ ecsServiceArn: serviceArn })).toEqual({
      finishedWhen: 'rollout-completed'
    });
    expect(polls).toBe(3);
    expect(targetReads).toBe(1);
  }, 30_000);
});

import type { KnownCloudFormationResource } from '@stacktape/cloudformation/resource';
import { describe, expect, test } from 'bun:test';
import type { CodeDeployClient } from '@aws-sdk/client-codedeploy';
import { CreateDeploymentCommand } from '@aws-sdk/client-codedeploy';
import type { ECSClient } from '@aws-sdk/client-ecs';
import {
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  DesiredStatus,
  ExecuteCommandCommand,
  ListTasksCommand,
  RegisterTaskDefinitionCommand,
  UpdateServiceCommand
} from '@aws-sdk/client-ecs';
import { AwsEcs } from '../../src/aws/ecs';

type EcsSend = ECSClient['send'];
type CodeDeploySend = CodeDeployClient['send'];

const ecsWith = ({
  ecsSend,
  codeDeploySend = (async () => ({})) as CodeDeploySend
}: {
  ecsSend: EcsSend;
  codeDeploySend?: CodeDeploySend;
}) =>
  new AwsEcs({
    createClient: () => ({ send: ecsSend }) as ECSClient,
    createCodeDeployClient: () => ({ send: codeDeploySend }) as CodeDeployClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

describe('AWS ECS operations', () => {
  test('paginates task ARNs and describes them in ECS-sized batches', async () => {
    const listRequests: ListTasksCommand[] = [];
    const describeRequests: DescribeTasksCommand[] = [];
    const firstPage = Array.from({ length: 150 }, (_, index) => `arn:task/${index}`);
    const secondPage = Array.from({ length: 51 }, (_, index) => `arn:task/${index + 150}`);
    const ecs = ecsWith({
      ecsSend: (async (command: ListTasksCommand | DescribeTasksCommand) => {
        if (command instanceof ListTasksCommand) {
          listRequests.push(command);
          return command.input.nextToken ? { taskArns: secondPage } : { nextToken: 'page-2', taskArns: firstPage };
        }
        describeRequests.push(command);
        return { tasks: command.input.tasks?.map((taskArn) => ({ taskArn })) };
      }) as EcsSend
    });

    const tasks = await ecs.listTasks({ ecsClusterName: 'application', desiredStatus: DesiredStatus.RUNNING });

    expect(listRequests.map(({ input }) => input)).toEqual([
      { cluster: 'application', desiredStatus: 'RUNNING' },
      { cluster: 'application', desiredStatus: 'RUNNING', nextToken: 'page-2' }
    ]);
    expect(describeRequests.map(({ input }) => input.tasks?.length)).toEqual([100, 100, 1]);
    expect(tasks).toHaveLength(201);
    expect(tasks.at(0)?.taskArn).toBe('arn:task/0');
    expect(tasks.at(-1)?.taskArn).toBe('arn:task/200');
  });

  test('keeps service lookup, tagged task-definition lookup, and registration inputs intact', async () => {
    const requests: (DescribeServicesCommand | DescribeTaskDefinitionCommand | RegisterTaskDefinitionCommand)[] = [];
    const ecs = ecsWith({
      ecsSend: (async (command: (typeof requests)[number]) => {
        requests.push(command);
        if (command instanceof DescribeServicesCommand) {
          return { services: [{ serviceArn: command.input.services?.[0] }] };
        }
        if (command instanceof DescribeTaskDefinitionCommand) {
          return { taskDefinition: { family: command.input.taskDefinition }, tags: [{ key: 'stage', value: 'dev' }] };
        }
        return { taskDefinition: { family: command.input.family, taskDefinitionArn: 'arn:task-definition/example:2' } };
      }) as EcsSend
    });
    const cloudformationTaskDefinition = {
      Properties: {
        ContainerDefinitions: [{ Essential: true, Image: 'example:latest', Name: 'api' }],
        Family: 'example'
      }
    } as unknown as KnownCloudFormationResource<'AWS::ECS::TaskDefinition'>;

    await ecs.getService({ serviceArn: 'arn:aws:ecs:eu-west-1:123456789012:service/application/api' });
    await ecs.getTaskDefinition({ ecsTaskDefinitionFamily: 'example' });
    await ecs.registerTaskDefinition({ cloudformationEcsTaskDefinition: cloudformationTaskDefinition });

    expect(requests.map(({ input }) => input)).toEqual([
      {
        cluster: 'application',
        services: ['arn:aws:ecs:eu-west-1:123456789012:service/application/api']
      },
      { include: ['TAGS'], taskDefinition: 'example' },
      {
        containerDefinitions: [{ essential: true, image: 'example:latest', name: 'api' }],
        family: 'example'
      }
    ]);
  });

  test('routes rolling and blue-green deployment starts to the correct clients', async () => {
    const ecsRequests: UpdateServiceCommand[] = [];
    const codeDeployRequests: CreateDeploymentCommand[] = [];
    const ecs = ecsWith({
      ecsSend: (async (command: UpdateServiceCommand) => {
        ecsRequests.push(command);
        return {};
      }) as EcsSend,
      codeDeploySend: (async (command: CreateDeploymentCommand) => {
        codeDeployRequests.push(command);
        return { deploymentId: 'deployment-1' };
      }) as CodeDeploySend
    });

    await ecs.startRollingUpdate({
      cluster: 'application',
      forceNewDeployment: true,
      service: 'api',
      taskDefinition: 'example:2'
    });
    await ecs.startCodeDeployUpdate({
      applicationName: 'application',
      deploymentGroupName: 'api',
      revision: { appSpecContent: { content: '{}' }, revisionType: 'AppSpecContent' }
    });

    expect(ecsRequests.map(({ input }) => input)).toEqual([
      { cluster: 'application', forceNewDeployment: true, service: 'api', taskDefinition: 'example:2' }
    ]);
    expect(codeDeployRequests.map(({ input }) => input)).toEqual([
      {
        applicationName: 'application',
        deploymentGroupName: 'api',
        revision: { appSpecContent: { content: '{}' }, revisionType: 'AppSpecContent' }
      }
    ]);
  });

  test('waits for the rolling deployment to converge, not just to reach its task count', async () => {
    // A rolling deployment reports runningCount === desiredCount while ECS is still validating the
    // new tasks against load balancer and Cloud Map health. Treating that as success reported a
    // healthy update for a rollout that was stuck IN_PROGRESS and that the circuit breaker could
    // still roll back.
    const serviceArn = 'arn:aws:ecs:eu-west-1:123456789999:service/application/api';
    const rolloutStates = ['IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED'];
    let polls = 0;
    const ecs = ecsWith({
      ecsSend: (async (command: DescribeServicesCommand) => {
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

  test('maps an ECS Exec session to the session-manager plugin contract', async () => {
    let request: ExecuteCommandCommand | undefined;
    const ecs = ecsWith({
      ecsSend: (async (command: ExecuteCommandCommand) => {
        request = command;
        return { session: { sessionId: 'session-1', streamUrl: 'wss://session', tokenValue: 'token' } };
      }) as EcsSend
    });

    await expect(
      ecs.startExecSession({ cluster: 'application', command: '/bin/sh', interactive: true, task: 'task-1' })
    ).resolves.toEqual({ SessionId: 'session-1', StreamUrl: 'wss://session', TokenValue: 'token' });
    expect(request?.input).toEqual({ cluster: 'application', command: '/bin/sh', interactive: true, task: 'task-1' });
  });

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

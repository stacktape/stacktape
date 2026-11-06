import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import {
  DescribeTaskDefinitionCommand,
  DescribeTasksCommand,
  ECSClient,
  ListTasksCommand,
  RunTaskCommand,
  StopTaskCommand
} from '@aws-sdk/client-ecs';
import { releaseCommand } from './release-command';

type Props = Parameters<typeof releaseCommand>[0];

const props = (overrides: Partial<Props> = {}): Props => ({
  cluster: 'cluster',
  taskDefinition: 'arn:aws:ecs:eu-central-1:1:task-definition/stack-web-release:2',
  containerName: 'app',
  timeoutSeconds: '3300',
  logGroupName: 'logs',
  run: { attemptId: 'attempt' },
  ...overrides
});

const context = (remainingMs = 800_000) => ({ getRemainingTimeInMillis: () => remainingMs }) as never;
const invocation = (chainState?: Record<string, unknown>) => ({
  requestId: 'request',
  ...(chainState ? { chainState } : {})
});

describe('the release command custom resource', () => {
  let stackStatus: string;
  let runningTasks: { taskArn: string; startedBy: string }[];
  let describedTask: unknown;
  let environments: Record<string, unknown>;
  let sent: unknown[];
  const spies: { mockRestore: () => void }[] = [];

  beforeEach(() => {
    stackStatus = 'UPDATE_IN_PROGRESS';
    runningTasks = [];
    describedTask = { lastStatus: 'RUNNING', containers: [{ name: 'app', exitCode: 0 }] };
    environments = {};
    sent = [];
    spies.push(
      spyOn(CloudFormationClient.prototype, 'send').mockImplementation((async (command: unknown) => {
        expect(command).toBeInstanceOf(DescribeStacksCommand);
        return { Stacks: [{ StackStatus: stackStatus }] };
      }) as never),
      spyOn(ECSClient.prototype, 'send').mockImplementation((async (command: { input: Record<string, unknown> }) => {
        sent.push(command);
        if (command instanceof ListTasksCommand) return { taskArns: runningTasks.map(({ taskArn }) => taskArn) };
        if (command instanceof RunTaskCommand) return { tasks: [{ taskArn: 'new-task' }] };
        if (command instanceof StopTaskCommand) return {};
        if (command instanceof DescribeTasksCommand) {
          return {
            tasks: (command.input.tasks as string[])[0] === 'new-task' ? [describedTask] : runningTasks
          };
        }
        if (command instanceof DescribeTaskDefinitionCommand) {
          return {
            taskDefinition: {
              containerDefinitions: [
                { name: 'app', environment: environments[command.input.taskDefinition as string] ?? [] }
              ]
            }
          };
        }
        throw new Error(`Unexpected command ${command}`);
      }) as never)
    );
  });

  afterEach(() => {
    while (spies.length) spies.pop()!.mockRestore();
  });

  const started = () => sent.filter((command) => command instanceof RunTaskCommand) as RunTaskCommand[];

  test('runs on Create, with the request ID as the idempotency token, and waits for the exit code', async () => {
    const result = await releaseCommand(
      props({ run: 'if-target-changed' }),
      undefined,
      'Create',
      undefined,
      context(),
      invocation()
    );
    expect(result.chainInvocation).toBeUndefined();
    expect(started()[0]!.input).toMatchObject({ clientToken: 'request', startedBy: 'stp-release:request' });
  });

  test('keeps the same physical ID on Update, so CloudFormation replaces nothing', async () => {
    const result = await releaseCommand(props(), props(), 'Update', 'existing-id', context(), invocation());
    expect(result.physicalResourceId).toBe('existing-id');
  });

  test('fails with the exit code and names the physical ID', async () => {
    describedTask = { lastStatus: 'RUNNING', containers: [{ name: 'app', exitCode: 3 }] };
    const error = await releaseCommand(props(), props(), 'Update', 'existing-id', context(), invocation()).catch(
      (caught) => caught
    );
    expect(error.message).toContain('exit code 3');
    expect(error.physicalResourceId).toBe('existing-id');
  });

  test('never runs on Delete, on `never`, or during a rollback', async () => {
    await releaseCommand(props(), undefined, 'Delete', 'id', context(), invocation());
    await releaseCommand(props({ run: 'never' }), props(), 'Update', 'id', context(), invocation());
    for (const status of ['UPDATE_ROLLBACK_IN_PROGRESS', 'ROLLBACK_IN_PROGRESS']) {
      stackStatus = status;
      await releaseCommand(props(), props(), 'Update', 'id', context(), invocation());
    }
    expect(started()).toEqual([]);
  });

  test('on `if-target-changed`, skips when the environment is the same', async () => {
    const previous = props({ taskDefinition: 'arn:aws:ecs:eu-central-1:1:task-definition/stack-web-release:1' });
    await releaseCommand(props({ run: 'if-target-changed' }), previous, 'Update', 'id', context(), invocation());
    expect(started()).toEqual([]);
  });

  test('on `if-target-changed`, runs when the environment changed, so a replaced database gets its schema', async () => {
    const previous = props({ taskDefinition: 'arn:aws:ecs:eu-central-1:1:task-definition/stack-web-release:1' });
    environments[previous.taskDefinition as string] = [{ name: 'DATABASE_URL', value: 'old' }];
    environments[props().taskDefinition as string] = [{ name: 'DATABASE_URL', value: 'new' }];
    await releaseCommand(props({ run: 'if-target-changed' }), previous, 'Update', 'id', context(), invocation());
    expect(started()).toHaveLength(1);
  });

  test('on `if-target-changed`, skips when no new task definition was registered', async () => {
    await releaseCommand(props({ run: 'if-target-changed' }), props(), 'Update', 'id', context(), invocation());
    expect(started()).toEqual([]);
  });

  test('refuses while another operation left a task running', async () => {
    runningTasks = [{ taskArn: 'left-behind', startedBy: 'stp-release:earlier' }];
    await expect(releaseCommand(props(), props(), 'Update', 'id', context(), invocation())).rejects.toThrow(
      /still running/
    );
    expect(started()).toEqual([]);
  });

  test('accepts its own task on a repeated delivery of the same request', async () => {
    runningTasks = [{ taskArn: 'mine', startedBy: 'stp-release:request' }];
    await releaseCommand(props(), props(), 'Update', 'id', context(), invocation());
    expect(started()).toHaveLength(1);
  });

  test('hands over to the next invocation near the Lambda limit, with the task and the deadline', async () => {
    describedTask = { lastStatus: 'RUNNING', containers: [{ name: 'app' }] };
    const result = await releaseCommand(props(), props(), 'Update', 'id', context(61_000), invocation());
    expect(result.chainInvocation).toBe(true);
    expect(result.chainState).toMatchObject({ taskArn: 'new-task' });
    expect((result.chainState as { deadlineMs: number }).deadlineMs).toBeGreaterThan(Date.now() + 3000_000);
  });

  test('a chained invocation continues the wait and starts nothing', async () => {
    const result = await releaseCommand(
      props(),
      props(),
      'Update',
      'id',
      context(),
      invocation({ taskArn: 'new-task', deadlineMs: Date.now() + 100_000 })
    );
    expect(result.chainInvocation).toBeUndefined();
    expect(started()).toEqual([]);
  });

  test('a chained invocation past the deadline stops the task and fails', async () => {
    await expect(
      releaseCommand(
        props(),
        props(),
        'Update',
        'id',
        context(),
        invocation({ taskArn: 'new-task', deadlineMs: Date.now() - 1 })
      )
    ).rejects.toThrow(/timeout/);
    expect(sent.some((command) => command instanceof StopTaskCommand)).toBe(true);
  });
});

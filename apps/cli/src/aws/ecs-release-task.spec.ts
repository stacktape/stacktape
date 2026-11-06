import { describe, expect, test } from 'bun:test';
import { DescribeTasksCommand, ListTasksCommand, RunTaskCommand } from '@aws-sdk/client-ecs';
import { findReleaseTaskOfAnotherOperation, releaseTaskStartedBy, startReleaseTask, waitForReleaseTask } from './ecs-release-task';

const describeSequence = (...responses: unknown[]) => {
  let index = 0;
  return {
    send: async () => responses[Math.min(index++, responses.length - 1)]
  } as never;
};

const running = { tasks: [{ lastStatus: 'RUNNING', containers: [{ name: 'app' }] }] };
const waitOptions = {
  cluster: 'c',
  taskArn: 't',
  containerName: 'app',
  stopWaitingAtMs: Number.MAX_SAFE_INTEGER,
  sleep: async () => {}
};

describe('waitForReleaseTask', () => {
  test('succeeds on exit code 0, before the task reaches STOPPED', async () => {
    const result = await waitForReleaseTask({
      ...waitOptions,
      ecs: describeSequence(running, { tasks: [{ lastStatus: 'DEACTIVATING', containers: [{ name: 'app', exitCode: 0 }] }] })
    });
    expect(result).toEqual({ outcome: 'succeeded' });
  });

  test('reports the exit code of the target, not of another container', async () => {
    const result = await waitForReleaseTask({
      ...waitOptions,
      ecs: describeSequence({
        tasks: [
          {
            lastStatus: 'RUNNING',
            containers: [
              { name: 'side', exitCode: 137 },
              { name: 'app', exitCode: 3 }
            ]
          }
        ]
      })
    });
    expect(result).toEqual({ outcome: 'failed', message: 'The release command failed with exit code 3.' });
  });

  test('reports why a task stopped without an exit code', async () => {
    const result = await waitForReleaseTask({
      ...waitOptions,
      ecs: describeSequence({
        tasks: [
          {
            lastStatus: 'STOPPED',
            stoppedReason: 'CannotPullContainerError',
            containers: [{ name: 'app', reason: 'pull access denied' }]
          }
        ]
      })
    });
    expect(result.outcome).toBe('failed');
    expect((result as { message: string }).message).toContain('CannotPullContainerError: pull access denied');
  });

  test('tolerates a task that is briefly missing', async () => {
    const result = await waitForReleaseTask({
      ...waitOptions,
      ecs: describeSequence({ tasks: [] }, { tasks: [] }, { tasks: [{ containers: [{ name: 'app', exitCode: 0 }] }] })
    });
    expect(result).toEqual({ outcome: 'succeeded' });
  });

  test('fails when ECS keeps not knowing the task', async () => {
    const result = await waitForReleaseTask({ ...waitOptions, ecs: describeSequence({ tasks: [] }) });
    expect(result.outcome).toBe('failed');
  });

  test('returns still-running at the time limit', async () => {
    let time = 0;
    const result = await waitForReleaseTask({
      ...waitOptions,
      ecs: describeSequence(running),
      stopWaitingAtMs: 10,
      now: () => time,
      sleep: async () => {
        time += 5;
      }
    });
    expect(result).toEqual({ outcome: 'still-running' });
  });

  test('stops waiting when asked', async () => {
    const result = await waitForReleaseTask({
      ...waitOptions,
      ecs: describeSequence(running),
      shouldStopWaiting: () => true
    });
    expect(result).toEqual({ outcome: 'still-running' });
  });
});

describe('startReleaseTask', () => {
  const start = (response: unknown) => {
    const inputs: unknown[] = [];
    return {
      inputs,
      run: (extra: Record<string, unknown> = {}) =>
        startReleaseTask({
          ecs: {
            send: async (command: RunTaskCommand) => {
              inputs.push(command.input);
              return response;
            }
          } as never,
          cluster: 'c',
          taskDefinition: 'td',
          startedBy: 'stp-release:r',
          clientToken: 'r',
          ...extra
        })
    };
  };

  test('passes the idempotency token and uses Fargate by default', async () => {
    const { run, inputs } = start({ tasks: [{ taskArn: 'arn' }] });
    expect(await run()).toBe('arn');
    expect(inputs[0]).toMatchObject({ clientToken: 'r', launchType: 'FARGATE', startedBy: 'stp-release:r' });
  });

  test('uses the capacity provider instead of a launch type on EC2', async () => {
    const { run, inputs } = start({ tasks: [{ taskArn: 'arn' }] });
    await run({ capacityProviderStrategy: [{ capacityProvider: 'cp', weight: 1 }] });
    expect(inputs[0]).toMatchObject({ capacityProviderStrategy: [{ capacityProvider: 'cp', weight: 1 }] });
    expect((inputs[0] as { launchType?: string }).launchType).toBeUndefined();
  });

  test('reports the failures ECS returned', async () => {
    const { run } = start({ tasks: [], failures: [{ reason: 'RESOURCE:MEMORY', detail: 'no capacity' }] });
    await expect(run()).rejects.toThrow('RESOURCE:MEMORY: no capacity');
  });
});

describe('findReleaseTaskOfAnotherOperation', () => {
  const sender = (tasks: { taskArn: string; startedBy: string }[]) =>
    ({
      send: async (command: unknown) => {
        if (command instanceof ListTasksCommand) return { taskArns: tasks.map(({ taskArn }) => taskArn) };
        if (command instanceof DescribeTasksCommand) return { tasks };
        throw new Error('unexpected');
      }
    }) as never;
  const startedBy = releaseTaskStartedBy('mine');

  test('ignores the task of a repeated delivery of the same request', async () => {
    const ecs = sender([{ taskArn: 'a', startedBy }]);
    expect(await findReleaseTaskOfAnotherOperation({ ecs, cluster: 'c', family: 'f', startedBy })).toBeUndefined();
  });

  test('finds a task another operation left running', async () => {
    const ecs = sender([{ taskArn: 'a', startedBy: releaseTaskStartedBy('other') }]);
    expect(await findReleaseTaskOfAnotherOperation({ ecs, cluster: 'c', family: 'f', startedBy })).toBe('a');
  });

  test('finds nothing when no task runs', async () => {
    expect(await findReleaseTaskOfAnotherOperation({ ecs: sender([]), cluster: 'c', family: 'f', startedBy })).toBeUndefined();
  });
});

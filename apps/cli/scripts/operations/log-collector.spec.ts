import { expect, spyOn, test } from 'bun:test';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import { LogCollectorStream } from '../../src/aws/log-collector';

import { CloudWatchLogsClient, CreateLogGroupCommand } from '@aws-sdk/client-cloudwatch-logs';
import { createOperationsFixture } from './cli-process';

// Real collector, service adapter and AWS SDK; only credentials and the HTTP destination are synthetic.
const fixture = async () => {
  const f = await createOperationsFixture('unused');
  const sdk = new CloudWatchLogsClient(f.clientConfig());
  await sdk.send(new CreateLogGroupCommand({ logGroupName: 'collector-proof' }));
  let fail: 'setup' | 'second-batch' | undefined;
  let batches = 0;
  let onPut: (() => Promise<void>) | undefined;
  const denied = () => ({
    kind: 'error' as const,
    code: 'AccessDeniedException',
    message: 'Injected denial',
    status: 403
  });
  f.aws.on('logs.DescribeLogGroups', () => (fail === 'setup' ? denied() : undefined));
  f.aws.on('logs.PutLogEvents', async ({ input }) => {
    // MiniStack sorts unordered input; inject CloudWatch's documented rejection instead of accepting that tolerance.
    const events = input.logEvents as Array<{ timestamp: number }>;
    if (events.some((event, index) => index > 0 && event.timestamp < events[index - 1].timestamp)) {
      return {
        kind: 'error',
        code: 'InvalidParameterException',
        message: 'Log events must be chronological',
        status: 400
      };
    }
    await onPut?.();
    batches++;
    return fail === 'second-batch' && batches === 2 ? denied() : undefined;
  });
  const manager = new AwsSdkManager();
  manager.init({ ...f.clientConfig(), endpoint: f.aws.endpoint, plugins: [] });
  const collector = new LogCollectorStream();
  collector.init({ awsSdkManager: manager, logGroupName: 'collector-proof', logStreamName: 'proof' });
  return {
    collector,
    messages: async () =>
      (await manager.observability.getLogEvents({ logGroupName: 'collector-proof' })).map(({ message }) => message),
    setFailure: (value: typeof fail) => {
      fail = value;
    },
    setOnPut: (value: typeof onPut) => {
      onPut = value;
    },
    close: async () => {
      sdk.destroy();
      await f.close();
    }
  };
};

test('delivers every log event when the wall clock moves backwards', async () => {
  const f = await fixture();
  const now = spyOn(Date, 'now');
  try {
    const baseline = Date.now();
    now.mockReturnValue(baseline + 2000);
    f.collector.write('later');
    now.mockReturnValue(baseline + 1000);
    f.collector.write('earlier');
    f.collector.write('same timestamp');
    now.mockRestore();
    await f.collector.makeFinalSend();
    expect(await f.messages()).toEqual(['earlier', 'same timestamp', 'later']);
  } finally {
    now.mockRestore();
    await f.close();
  }
});

test('retries setup failures without leaving the sender permanently busy', async () => {
  const f = await fixture();
  try {
    f.collector.write('retained during setup failure');
    f.setFailure('setup');
    await expect(f.collector.makeFinalSend()).rejects.toThrow();
    f.setFailure(undefined);
    await f.collector.makeFinalSend();
    expect(await f.messages()).toEqual(['retained during setup failure']);
  } finally {
    await f.close();
  }
});

test('batches UTF-8 bytes and retries only events not previously acknowledged', async () => {
  const f = await fixture();
  const messages = Array.from({ length: 14 }, (_, index) => `${index}:${'界'.repeat(40_000)}`);
  try {
    for (const message of messages) f.collector.write(message);
    f.setFailure('second-batch');
    await expect(f.collector.makeFinalSend()).rejects.toThrow();
    expect((await f.messages()).length).toBeGreaterThan(0);
    expect((await f.messages()).length).toBeLessThan(messages.length);
    f.setFailure(undefined);
    await f.collector.makeFinalSend();
    expect(await f.messages()).toEqual(messages);
  } finally {
    await f.close();
  }
});

test('final cleanup waits for an active interval request and drains later writes', async () => {
  const f = await fixture();
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  try {
    f.setOnPut(async () => {
      started.resolve();
      await release.promise;
    });
    f.collector.write('interval request');
    await started.promise;
    f.collector.write('written during request');
    let finished = false;
    const final = Promise.resolve(f.collector.makeFinalSend()).then(() => {
      finished = true;
    });
    await Bun.sleep(1200);
    expect(finished).toBe(false);
    release.resolve();
    await final;
    expect(await f.messages()).toEqual(['interval request', 'written during request']);
  } finally {
    release.resolve();
    await f.collector.makeFinalSend();
    await f.close();
  }
}, 10_000);

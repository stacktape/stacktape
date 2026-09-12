import { expect, spyOn, test } from 'bun:test';
import { AwsSdkManager } from '../sdk-manager';
import { LogCollectorStream } from './index';

type Event = { message: string; timestamp: number };

// Real collector, service adapter and AWS SDK; only credentials and the HTTP destination are synthetic.
const fixture = () => {
  const accepted: Event[] = [];
  let fail: 'setup' | 'second-batch' | undefined;
  let batches = 0;
  let onPut: (() => Promise<void>) | undefined;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const action = request.headers.get('x-amz-target')?.split('.').at(-1);
      const body = (await request.json()) as { logEvents: Event[] };
      const denied = () =>
        Response.json({ __type: 'AccessDeniedException', message: 'Injected denial' }, { status: 403 });
      if (action === 'DescribeLogGroups') {
        if (fail === 'setup') return denied();
        return Response.json({ logGroups: [{ logGroupName: 'collector-proof' }] });
      }
      if (action === 'CreateLogStream') return Response.json({});
      if (action !== 'PutLogEvents') return new Response('Unexpected action', { status: 400 });
      await onPut?.();
      const events = body.logEvents;
      const bytes = events.reduce((total, event) => total + Buffer.byteLength(event.message) + 26, 0);
      const ordered = events.every((event, index) => !index || event.timestamp >= events[index - 1].timestamp);
      if (!ordered || bytes > 1_048_576 || events.length > 10_000) {
        return Response.json({ __type: 'InvalidParameterException', message: 'Invalid log batch' }, { status: 400 });
      }
      batches++;
      if (fail === 'second-batch' && batches === 2) return denied();
      accepted.push(...events);
      return Response.json({});
    }
  });
  const manager = new AwsSdkManager();
  manager.init({
    credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' },
    endpoint: server.url.toString(),
    region: 'eu-west-1',
    plugins: []
  });
  const collector = new LogCollectorStream();
  collector.init({ awsSdkManager: manager, logGroupName: 'collector-proof', logStreamName: 'proof' });
  return {
    collector,
    accepted,
    setFailure: (value: typeof fail) => {
      fail = value;
    },
    setOnPut: (value: typeof onPut) => {
      onPut = value;
    },
    close: () => server.stop(true)
  };
};

test('delivers every log event when the wall clock moves backwards', async () => {
  const f = fixture();
  const now = spyOn(Date, 'now');
  try {
    now.mockReturnValue(2000);
    f.collector.write('later');
    now.mockReturnValue(1000);
    f.collector.write('earlier');
    f.collector.write('same timestamp');
    now.mockRestore();
    await f.collector.makeFinalSend();
    expect(f.accepted.map((event) => event.message)).toEqual(['earlier', 'same timestamp', 'later']);
  } finally {
    now.mockRestore();
    f.close();
  }
});

test('retries setup failures without leaving the sender permanently busy', async () => {
  const f = fixture();
  try {
    f.collector.write('retained during setup failure');
    f.setFailure('setup');
    await expect(f.collector.makeFinalSend()).rejects.toThrow();
    f.setFailure(undefined);
    await f.collector.makeFinalSend();
    expect(f.accepted.map((event) => event.message)).toEqual(['retained during setup failure']);
  } finally {
    f.close();
  }
});

test('batches UTF-8 bytes and retries only events not previously acknowledged', async () => {
  const f = fixture();
  const messages = Array.from({ length: 14 }, (_, index) => `${index}:${'界'.repeat(40_000)}`);
  try {
    for (const message of messages) f.collector.write(message);
    f.setFailure('second-batch');
    await expect(f.collector.makeFinalSend()).rejects.toThrow();
    expect(f.accepted.length).toBeGreaterThan(0);
    expect(f.accepted.length).toBeLessThan(messages.length);
    f.setFailure(undefined);
    await f.collector.makeFinalSend();
    expect(f.accepted.map((event) => event.message)).toEqual(messages);
  } finally {
    f.close();
  }
});

test('final cleanup waits for an active interval request and drains later writes', async () => {
  const f = fixture();
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
    expect(f.accepted.map((event) => event.message)).toEqual(['interval request', 'written during request']);
  } finally {
    release.resolve();
    await f.collector.makeFinalSend();
    f.close();
  }
}, 10_000);

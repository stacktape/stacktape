import { expect, test } from 'bun:test';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import { startLoopbackAws } from '../../scripts/operations/loopback-aws';

// MiniStack lacks Logs Insights. The real service adapter/SDK consumes realistic wire states here.
test('Logs Insights waits for completion, rejects terminal failures, and stops at its deadline', async () => {
  const aws = await startLoopbackAws();
  const manager = new AwsSdkManager();
  manager.init({
    endpoint: aws.endpoint,
    region: 'eu-west-1',
    credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' },
    plugins: []
  });
  let polls = 0;
  let stopped = false;
  aws.on('logs.StartQuery', () => ({ kind: 'json', body: { queryId: 'query-1' } }));
  aws.on('logs.GetQueryResults', () => ({
    kind: 'json',
    body:
      ++polls === 1 ? { status: 'Running' } : { status: 'Complete', results: [[{ field: '@message', value: 'ready' }]] }
  }));
  aws.on('logs.StopQuery', () => {
    stopped = true;
    return { kind: 'json', body: {} };
  });
  const run = (timeoutMs = 1000) =>
    manager.observability.runLogsInsightsQuery({
      logGroupName: 'example',
      query: 'fields @message',
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-01-01T01:00:00Z'),
      pollIntervalMs: 0,
      timeoutMs
    });
  try {
    expect(await run()).toEqual({ results: [{ '@message': 'ready' }] });
    expect(polls).toBe(2);
    for (const status of ['Failed', 'Cancelled', 'Timeout', 'Unknown', undefined]) {
      aws.on('logs.GetQueryResults', () => ({ kind: 'json', body: { status } }));
      await expect(run()).rejects.toMatchObject({ code: 'LOGS_INSIGHTS_QUERY_TERMINAL_STATUS' });
    }
    await expect(run(0)).rejects.toMatchObject({ code: 'LOGS_INSIGHTS_QUERY_TIMEOUT' });
    expect(stopped).toBe(true);
    expect(aws.unexpected).toEqual([]);
  } finally {
    await aws.close();
  }
});

// Read-only request/duration evidence, retained before CFN removes the log group.
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { z } from 'zod';
import { clients, guard, getStack, save, type Owned } from './run';

const main = async () => {
  await guard();
  const directory = resolve(process.argv[2]!);
  const state = z
    .object({
      account: z.literal('597581086285'),
      region: z.literal('eu-west-1'),
      profile: z.literal('stacktape-e2e'),
      resources: z.array(
        z.object({
          name: z.string(),
          owner: z.string(),
          table: z.string(),
          bucket: z.string(),
          repository: z.string(),
          directory: z.string(),
          stackId: z.string().optional()
        })
      )
    })
    .parse(JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')));
  const owned: Owned = state.resources[0]!;
  const logs = new CloudWatchLogsClient(clients),
    cloudwatch = new CloudWatchClient(clients);
  const retained = new Map<string, { message: string; timestamp: number }>();
  const until = performance.now() + 30 * 60 * 1000;
  let seen = false;
  while (performance.now() < until) {
    const stack = await getStack(owned);
    if (stack && !stack.Tags?.some((tag) => tag.Key === 'code-swap-benchmark-owner' && tag.Value === owned.owner))
      throw new Error('Observation ownership mismatch.');
    try {
      let nextToken: string | undefined;
      do {
        const previous = nextToken;
        const page = await logs.send(
          new FilterLogEventsCommand({ logGroupName: `/aws/lambda/${owned.name}-capacity`, nextToken })
        );
        for (const event of page.events ?? []) {
          if (
            event.eventId &&
            event.message &&
            (event.message.includes('capacityAdmission') || event.message.includes('REPORT RequestId'))
          )
            retained.set(event.eventId, { message: event.message, timestamp: event.timestamp ?? 0 });
        }
        nextToken = page.nextToken;
        if (nextToken === previous) break;
      } while (nextToken);
      seen = true;
    } catch (error) {
      if (!(error instanceof Error && error.name === 'ResourceNotFoundException')) throw error;
      if (seen && !stack) break;
    }
    await save(join(directory, 'capacity-request-observation.json'), {
      clock: 'AWS CloudWatch event timestamps and Lambda/task Unix timestamps',
      events: [...retained.values()]
    });
    if (seen && !stack) break;
    await Bun.sleep(5000);
  }
  const events = [...retained.values()];
  const times = events.map((event) => event.timestamp).filter(Boolean);
  if (!times.length) throw new Error('No owned capacity log evidence.');
  const StartTime = new Date(Math.min(...times) - 60000),
    EndTime = new Date(Math.max(...times) + 120000);
  const get = async (
    Namespace: string,
    MetricName: string,
    Dimensions: { Name: string; Value: string }[],
    Statistics: ('Sum' | 'SampleCount' | 'Maximum')[]
  ) => {
    const response = await cloudwatch.send(
      new GetMetricStatisticsCommand({ Namespace, MetricName, Dimensions, StartTime, EndTime, Period: 60, Statistics })
    );
    return { available: Boolean(response.Datapoints?.length), datapoints: response.Datapoints ?? [] };
  };
  const lambdaMetrics: Record<string, unknown> = {};
  for (const metric of ['Invocations', 'Errors', 'Throttles', 'Duration'])
    lambdaMetrics[metric] = await get(
      'AWS/Lambda',
      metric,
      [{ Name: 'FunctionName', Value: `${owned.name}-capacity` }],
      metric === 'Duration' ? ['Sum', 'SampleCount', 'Maximum'] : ['Sum']
    );
  const ddbRequests: Record<string, unknown> = {};
  for (const operation of [
    'GetItem',
    'PutItem',
    'BatchGetItem',
    'TransactWriteItems',
    'ConditionCheckItem',
    'DeleteItem'
  ])
    ddbRequests[operation] = await get(
      'AWS/DynamoDB',
      'SuccessfulRequestLatency',
      [
        { Name: 'TableName', Value: owned.table },
        { Name: 'Operation', Value: operation }
      ],
      ['SampleCount']
    );
  const capacityUnits: Record<string, unknown> = {};
  for (const metric of ['ConsumedReadCapacityUnits', 'ConsumedWriteCapacityUnits'])
    capacityUnits[metric] = await get('AWS/DynamoDB', metric, [{ Name: 'TableName', Value: owned.table }], ['Sum']);
  const reports = events.filter((event) => event.message.includes('REPORT RequestId'));
  const billedMs = reports.reduce(
    (sum, event) => sum + Number(/Billed Duration:\s*([\d.]+)/.exec(event.message)?.[1] ?? 0),
    0
  );
  await save(join(directory, 'capacity-measured-counts.json'), {
    scope:
      'Owned table/function including CLI observer/preflight reads and intentional duplicate/refusal work; no app logs or normal ECS compute',
    StartTime,
    EndTime,
    lambdaMetrics,
    ddbRequests,
    capacityUnits,
    lambdaReports: reports.length,
    billedMs,
    events
  });
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

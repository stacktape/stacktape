import { describe, expect, test } from 'bun:test';
import { deployResourceList, foldDeployResource, recordDeployEvent, type DeployResource } from './deploy-resources';

const tick = (ts: string, detail: Record<string, unknown>) => ({
  type: 'event',
  ts,
  phase: 'DEPLOY',
  eventType: 'UPDATE_STACK',
  status: 'running',
  message: 'progress',
  detail: { kind: 'cloudformation-progress', stackAction: 'create', ...detail }
});

const fold = (events: unknown[]) => {
  const resources = new Map<string, DeployResource>();
  for (const event of events) foldDeployResource(resources, event);
  return deployResourceList(resources);
};

describe('the resources a deploy reports', () => {
  test('a resource keeps its start from the stream and gets its end and type when it completes', () => {
    const since = Date.parse('2026-11-20T10:00:02.000Z');
    expect(
      fold([
        tick('2026-11-20T10:00:05.000Z', {
          inProgressResources: ['MainDatabaseDbInstance'],
          inProgressDetails: [
            { name: 'MainDatabaseDbInstance', action: 'CREATE', resourceType: 'AWS::RDS::DBInstance', since }
          ]
        }),
        tick('2026-11-20T10:08:10.000Z', {
          inProgressResources: [],
          recentlyCompleted: [
            { name: 'MainDatabaseDbInstance', action: 'CREATE', resourceType: 'AWS::RDS::DBInstance' }
          ]
        })
      ])
    ).toEqual([
      {
        id: 'MainDatabaseDbInstance',
        type: 'AWS::RDS::DBInstance',
        action: 'CREATE',
        status: 'complete',
        startedAt: '2026-11-20T10:00:02.000Z',
        endedAt: '2026-11-20T10:08:10.000Z'
      }
    ]);
  });

  test('without details, the first tick that lists a resource is its start', () => {
    const [resource] = fold([
      tick('2026-11-20T10:00:05.000Z', { inProgressResources: ['AppBucketBucket'] }),
      tick('2026-11-20T10:00:09.000Z', { inProgressResources: ['AppBucketBucket'] })
    ]);
    expect(resource).toEqual({
      id: 'AppBucketBucket',
      action: 'CREATE',
      status: 'in-progress',
      startedAt: '2026-11-20T10:00:05.000Z'
    });
  });

  test('a resource that finished between two ticks has an end and no start', () => {
    const [resource] = fold([
      tick('2026-11-20T10:00:05.000Z', {
        recentlyCompleted: [
          { name: 'AppServerFunctionLogGroup', action: 'CREATE', resourceType: 'AWS::Logs::LogGroup' }
        ]
      })
    ]);
    expect(resource?.startedAt).toBeUndefined();
    expect(resource?.endedAt).toBe('2026-11-20T10:00:05.000Z');
  });

  test('a rollback removing a created resource starts it over as a removal', () => {
    const [resource] = fold([
      tick('2026-11-20T10:00:05.000Z', {
        recentlyCompleted: [{ name: 'AppBucketBucket', action: 'CREATE', resourceType: 'AWS::S3::Bucket' }]
      }),
      tick('2026-11-20T10:03:00.000Z', {
        inProgressResources: ['AppBucketBucket'],
        inProgressDetails: [{ name: 'AppBucketBucket', action: 'DELETE', resourceType: 'AWS::S3::Bucket' }]
      }),
      tick('2026-11-20T10:03:20.000Z', {
        recentlyCompleted: [{ name: 'AppBucketBucket', action: 'DELETE', resourceType: 'AWS::S3::Bucket' }]
      })
    ]);
    expect(resource).toMatchObject({
      action: 'DELETE',
      status: 'complete',
      startedAt: '2026-11-20T10:03:00.000Z',
      endedAt: '2026-11-20T10:03:20.000Z'
    });
  });

  test('anything but CloudFormation progress changes nothing', () => {
    const resources = new Map<string, DeployResource>();
    expect(foldDeployResource(resources, { type: 'log', message: 'hello' })).toBe(false);
    expect(foldDeployResource(resources, { type: 'event', phase: 'INITIALIZE', eventType: 'LOAD_CONFIG_FILE' })).toBe(
      false
    );
    expect(resources.size).toBe(0);
  });
});

describe('the capped event list', () => {
  test('build output and old CloudFormation ticks leave before the operations that name the phases', () => {
    const start = { type: 'event', phase: 'INITIALIZE', eventType: 'LOAD_CONFIG_FILE', status: 'started' };
    const output = { type: 'output', lines: ['#1 building'] };
    const oldTick = tick('2026-11-20T10:00:05.000Z', { completedCount: 1 });
    const newTick = tick('2026-11-20T10:00:09.000Z', { completedCount: 2 });
    const log = { type: 'log', level: 'info', message: 'later' };
    let list: unknown[] = [];
    for (const event of [start, output, oldTick, newTick]) list = recordDeployEvent(list, event, 3);
    expect(list).toEqual([start, oldTick, newTick]);
    list = recordDeployEvent(list, log, 3);
    // The newest tick holds the current counts, so it stays.
    expect(list).toEqual([start, newTick, log]);
  });
});

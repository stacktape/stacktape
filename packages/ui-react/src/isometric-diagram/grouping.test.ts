import type { IsoScene } from './scene.js';
import { describe, expect, test } from 'bun:test';
import { getFixtureById, parseFixtureConfig } from './fixture-scenes.js';
import { findRoleGroups, groupTopology, MIN_GROUP_SIZE } from './grouping.js';
import { buildIsometricScene } from './scene-builder.js';
import { buildDiagramTopology } from './topology.js';

const lambda = ({ events, ...properties }: { events?: unknown[]; [key: string]: unknown } = {}) => ({
  type: 'function',
  properties: {
    packaging: { type: 'js-bundle', properties: { entryfilePath: 'src/index.ts' } },
    ...(events ? { events } : {}),
    ...properties
  }
});
const route = (method: string, path: string, extra: Record<string, unknown> = {}) => ({
  type: 'http-api-gateway',
  properties: { httpApiGatewayName: 'api', method, path, ...extra }
});
const poll = { type: 'sqs', properties: { sqsQueueName: 'jobs' } };
const push = { type: 'sns', properties: { snsTopicName: 'events' } };
const schedule = (rate: string) => ({ type: 'schedule', properties: { scheduleRate: rate } });

const tilesOf = (scene: IsoScene) => new Map(scene.nodes.map((node) => [node.id, node.tile]));

const topologyOf = (resources: Record<string, unknown>) => {
  const topology = buildDiagramTopology({ parsedConfig: { resources } as never });
  if (!topology) throw new Error('Expected a topology');
  return topology;
};
const groupsOf = (resources: Record<string, unknown>) =>
  findRoleGroups({ topology: topologyOf(resources) }).map(({ label, memberIds }) => ({ label, memberIds }));

const channels = {
  api: { type: 'http-api-gateway' },
  jobs: { type: 'sqs-queue' },
  events: { type: 'sns-topic' },
  table: { type: 'dynamo-db-table' }
};

describe('role groups', () => {
  test(`need ${MIN_GROUP_SIZE} members that share every trigger`, () => {
    expect(MIN_GROUP_SIZE).toBe(3);
    const twoRoutes = {
      ...channels,
      a: lambda({ events: [route('GET', '/a')] }),
      b: lambda({ events: [route('GET', '/b')] })
    };
    expect(groupsOf(twoRoutes)).toEqual([]);
    expect(groupsOf({ ...twoRoutes, c: lambda({ events: [route('POST', '/c')] }) })).toEqual([
      { label: 'api routes', memberIds: ['a', 'b', 'c'] }
    ]);
    // A second trigger is a different role, even with the same API in it.
    expect(
      groupsOf({
        ...twoRoutes,
        c: lambda({ events: [route('POST', '/c'), poll] })
      })
    ).toEqual([]);
  });

  test('are named after the role their trigger gives them', () => {
    const three = (prefix: string, events?: unknown[]) =>
      Object.fromEntries([1, 2, 3].map((index) => [`${prefix}${index}`, lambda(events ? { events } : {})]));
    const groups = groupsOf({
      ...channels,
      ...three('route', [route('GET', '/x')]),
      ...three('consumer', [poll]),
      ...three('subscriber', [push]),
      ...three('cron', [schedule('rate(1 day)')]),
      ...three('plain')
    });
    expect(groups.map((group) => group.label)).toEqual([
      'api routes',
      'jobs consumers',
      'events subscribers',
      'Scheduled jobs',
      'Functions'
    ]);
  });

  test('keep network placement apart and say which group runs in the VPC', () => {
    const groups = groupsOf({
      ...channels,
      ...Object.fromEntries([1, 2, 3].map((index) => [`out${index}`, lambda({ events: [poll] })])),
      ...Object.fromEntries([1, 2, 3].map((index) => [`in${index}`, lambda({ events: [poll], joinDefaultVpc: true })]))
    });
    expect(groups).toEqual([
      { label: 'jobs consumers', memberIds: ['out1', 'out2', 'out3'] },
      { label: 'jobs consumers (VPC)', memberIds: ['in1', 'in2', 'in3'] }
    ]);
  });

  test('group batch jobs apart from functions and never group data stores or implicit nodes', () => {
    const job = { type: 'batch-job', properties: { events: [poll] } };
    const groups = groupsOf({
      ...channels,
      t1: { type: 'dynamo-db-table' },
      t2: { type: 'dynamo-db-table' },
      t3: { type: 'dynamo-db-table' },
      j1: job,
      j2: job,
      j3: job,
      f1: lambda({ events: [poll] }),
      f2: lambda({ events: [poll] })
    });
    expect(groups).toEqual([{ label: 'jobs consumers', memberIds: ['j1', 'j2', 'j3'] }]);
  });

  test('have deterministic ids that cannot collide with resource names', () => {
    const resources = {
      ...channels,
      a: lambda({ events: [route('GET', '/a')] }),
      b: lambda({ events: [route('GET', '/b')] }),
      c: lambda({ events: [route('GET', '/c')] })
    };
    const ids = findRoleGroups({ topology: topologyOf(resources) }).map((group) => group.id);
    expect(ids).toEqual(['group--function--api-request']);
    // Declaration order does not change a group's id.
    const reversed = Object.fromEntries(Object.entries(resources).reverse());
    expect(findRoleGroups({ topology: topologyOf(reversed) }).map((group) => group.id)).toEqual(ids);
    expect(ids.every((id) => id.includes('--'))).toBe(true);
  });
});

const external = (queue: string) => ({
  type: 'sqs',
  properties: { sqsQueueArn: `arn:aws:sqs:eu-west-1:123456789012:${queue}` }
});

describe('triggers the diagram cannot draw', () => {
  test('keep functions on different external queues apart', () => {
    const queues = { orders: 'orders-queue', payments: 'payments-queue', notifications: 'notifications-queue' };
    const onQueues = (withApi: boolean) =>
      Object.fromEntries(
        Object.entries(queues).map(([name, queue]) => [
          name,
          lambda({ events: withApi ? [route('GET', `/${name}`), external(queue)] : [external(queue)] })
        ])
      );
    expect(groupsOf(onQueues(false))).toEqual([]);
    // The same HTTP API on all three does not make them one role either.
    expect(groupsOf({ ...channels, ...onQueues(true) })).toEqual([]);
  });

  test('group consumers of one external queue under its name and list the queue for each member', () => {
    const resources = Object.fromEntries(
      ['a', 'b', 'c'].map((name) => [name, lambda({ events: [external('orders-queue')] })])
    );
    expect(groupsOf(resources)).toEqual([{ label: 'orders-queue consumers', memberIds: ['a', 'b', 'c'] }]);
    const scene = buildIsometricScene({ parsedConfig: { resources } as never })!;
    expect(scene.groups[0].members.map((member) => member.triggers)).toEqual([
      ['orders-queue · poll (not drawn)'],
      ['orders-queue · poll (not drawn)'],
      ['orders-queue · poll (not drawn)']
    ]);
  });

  test('keep a function with an extra undrawn trigger out of a group of functions without it', () => {
    const alarm = { type: 'cloudwatch-alarm', properties: { alarmName: 'high-latency' } };
    const resources = {
      ...channels,
      a: lambda({ events: [route('GET', '/a')] }),
      b: lambda({ events: [route('GET', '/b')] }),
      c: lambda({ events: [route('GET', '/c')] }),
      d: lambda({ events: [route('GET', '/d'), alarm] })
    };
    expect(groupsOf(resources)).toEqual([{ label: 'api routes', memberIds: ['a', 'b', 'c'] }]);
    const scene = buildIsometricScene({ parsedConfig: { resources } as never })!;
    expect(scene.nodes.find((node) => node.id === 'd')?.undrawnTriggers).toEqual(['high-latency · alarm (not drawn)']);
  });

  test('identify every event type a function or batch job can declare', () => {
    const events = [
      { type: 'sns', properties: { snsTopicArn: 'arn:aws:sns:eu-west-1:1:alerts' } },
      { type: 'kinesis-stream', properties: { streamArn: 'arn:aws:kinesis:eu-west-1:1:stream/clicks' } },
      { type: 'dynamo-db-stream', properties: { streamArn: 'arn:aws:dynamodb:eu-west-1:1:table/Users/stream/2026' } },
      { type: 's3', properties: { bucketArn: 'arn:aws:s3:::uploads' } },
      { type: 'event-bus', properties: { useDefaultBus: true, eventPattern: { source: ['app'] } } },
      {
        type: 'kafka-topic',
        properties: { mskClusterArn: 'arn:aws:kafka:eu-west-1:1:cluster/main/x', topicName: 'orders' }
      },
      { type: 'cloudwatch-log', properties: { logGroupArn: 'arn:aws:logs:eu-west-1:1:log-group:/aws/app:*' } },
      { type: 'application-load-balancer', properties: { loadBalancerName: 'missingLb', priority: 1, paths: ['/x'] } }
    ];
    const topology = topologyOf({ worker: lambda({ events }) });
    expect(
      topology.nodes.find((node) => node.id === 'worker')?.undrawnTriggers?.map((trigger) => trigger.text)
    ).toEqual([
      'alerts · push (not drawn)',
      'clicks · stream (not drawn)',
      'Users · stream (not drawn)',
      'uploads · trigger (not drawn)',
      'default event bus · event (not drawn)',
      'Kafka topic orders (not drawn)',
      '/aws/app · log events (not drawn)',
      'missingLb · /x (not drawn)'
    ]);
    // Triggers whose sender is drawn are not repeated.
    expect(
      topologyOf({ ...channels, f: lambda({ events: [poll, route('GET', '/')] }) }).nodes.find(
        (node) => node.id === 'f'
      )?.undrawnTriggers
    ).toBeUndefined();
  });
});

describe('merged connectors', () => {
  const resources = {
    ...channels,
    users: { type: 'user-auth-pool' },
    list: lambda({ events: [route('GET', '/items'), route('HEAD', '/items')], connectTo: ['table'] }),
    create: lambda({
      events: [route('POST', '/items', { authorizer: { type: 'cognito', properties: { userPoolName: 'users' } } })],
      connectTo: ['table', 'jobs']
    }),
    remove: lambda({ events: [route('DELETE', '/items/{id}')] }),
    cron1: lambda({ events: [schedule('rate(1 hour)')], connectTo: ['table'] }),
    cron2: lambda({ events: [schedule('rate(1 day)')], connectTo: ['table'] }),
    cron3: lambda({ events: [schedule('rate(1 day)')] }),
    worker1: lambda({ events: [poll] }),
    worker2: lambda({ events: [poll] }),
    worker3: lambda({ events: [poll] })
  };
  const grouped = groupTopology({ topology: topologyOf(resources) });
  const edge = (from: string, to: string) =>
    grouped.edges.find((candidate) => candidate.from === from && candidate.to === to);
  const routes = 'group--function--api-request';
  const scheduled = 'group--function--schedule--implicit-event';
  const workers = 'group--function--jobs-event';

  test('replace members with one node in the first member’s place', () => {
    expect(grouped.nodes.map((node) => node.id)).toEqual([
      'api',
      'jobs',
      'events',
      'table',
      'users',
      routes,
      scheduled,
      workers,
      'user',
      'schedule--implicit'
    ]);
    expect(grouped.nodes.find((node) => node.id === routes)).toMatchObject({
      label: 'api routes',
      typeLabel: '3 functions',
      memberIds: ['list', 'create', 'remove']
    });
  });

  test('leave one connector per neighbour and semantic, counting routes rather than functions', () => {
    expect(grouped.edges.filter((candidate) => candidate.from === 'api' && candidate.to === routes)).toHaveLength(1);
    expect(edge('api', routes)).toMatchObject({ semantic: 'request', label: '4 routes', count: 3 });
    expect(edge(routes, 'table')).toMatchObject({ semantic: 'dependency', summary: 'used by 2 of 3', count: 2 });
    expect(edge(routes, 'table')?.description).toStartWith('Used by 2 of 3 functions in api routes.');
    expect(edge(routes, 'jobs')).toMatchObject({ summary: 'used by 1 of 3' });
    // The authorizer's user pool keeps its own security edge from the API.
    expect(edge('api', 'users')).toMatchObject({ semantic: 'security', label: 'JWT auth' });
  });

  test('keep a uniform event label and count mixed ones', () => {
    expect(edge('jobs', workers)).toMatchObject({ label: 'poll', summary: 'reaches all 3' });
    expect(edge('schedule--implicit', scheduled)).toMatchObject({ label: '3 schedules', count: 3 });
  });

  test('leave connectors between ungrouped nodes untouched', () => {
    const base = topologyOf(resources);
    const untouched = base.edges.filter(
      (candidate) => !grouped.collapsedInto.has(candidate.from) && !grouped.collapsedInto.has(candidate.to)
    );
    for (const original of untouched) expect(grouped.edges).toContainEqual(original);
  });

  test('restore members and their own connectors when a group is expanded', () => {
    const base = topologyOf(resources);
    const expanded = groupTopology({ topology: base, expandedGroupIds: new Set([routes]) });
    expect(expanded.nodes.map((node) => node.id)).toEqual([
      'api',
      'jobs',
      'events',
      'table',
      'users',
      'list',
      'create',
      'remove',
      scheduled,
      workers,
      'user',
      'schedule--implicit'
    ]);
    expect(expanded.groups.find((group) => group.id === routes)?.expanded).toBe(true);
    expect(expanded.edges.filter((candidate) => candidate.from === 'api' && candidate.semantic === 'request')).toEqual(
      base.edges.filter((candidate) => candidate.from === 'api' && candidate.semantic === 'request')
    );
  });
});

describe('grouped scenes', () => {
  const fixture = getFixtureById({ id: 'serverless-routes' });
  const config = parseFixtureConfig({ fixture });

  test('describe groups, members and routes for the side panel', () => {
    const scene = buildIsometricScene({ parsedConfig: config })!;
    const routes = scene.groups.find((group) => group.label === 'api routes')!;
    expect(routes).toMatchObject({ typeLabel: '6 functions', expanded: false });
    expect(routes.members.find((member) => member.id === 'createOrder')).toMatchObject({
      triggers: ['POST /orders'],
      connections: expect.arrayContaining([
        expect.objectContaining({ direction: 'out', nodeId: 'orderQueue', name: 'orderQueue', semantic: 'dependency' })
      ])
    });
    const subscribers = scene.groups.find((group) => group.label === 'orderEvents subscribers')!;
    expect(subscribers.members.map((member) => member.triggers)).toEqual([
      ['orderEvents · push'],
      ['orderEvents · push'],
      ['orderEvents · push']
    ]);

    const api = scene.nodes.find((node) => node.id === 'api')!;
    expect(api.routes).toContainEqual({
      method: 'PUT',
      path: '/products/{id}',
      target: 'updateProduct',
      targetNodeId: routes.id,
      authorizer: 'users'
    });
    expect(api.connections).toContainEqual({
      direction: 'out',
      semantic: 'request',
      nodeId: routes.id,
      name: 'api routes',
      text: '6 routes'
    });
    // The API checks tokens signed by the user pool; it does not protect the pool.
    expect(api.connections).toContainEqual({
      direction: 'out',
      semantic: 'auth',
      nodeId: 'users',
      name: 'users',
      text: 'JWT auth'
    });
    const group = scene.nodes.find((node) => node.id === routes.id)!;
    expect(group).toMatchObject({ shape: 'deck', memberCount: 6, groupId: routes.id, typeLabel: '6 functions' });
    // The two scheduled jobs stay separate: a group needs three.
    expect(scene.nodes.filter((node) => node.label === 'nightlyReport' || node.label === 'expireCarts')).toHaveLength(
      2
    );
  });

  test('keep unrelated nodes in their flow order when a group expands and collapses', () => {
    const groupId = 'group--function--api-request';
    const collapsed = buildIsometricScene({ parsedConfig: config })!;
    const expanded = buildIsometricScene({ parsedConfig: config, expandedGroups: new Set([groupId]) })!;
    const again = buildIsometricScene({ parsedConfig: config, expandedGroups: new Set() })!;
    expect(again).toEqual(collapsed);

    const members = new Set(collapsed.groups.find((group) => group.id === groupId)!.members.map((member) => member.id));
    expect(expanded.nodes.filter((node) => members.has(node.id)).every((node) => node.groupId === groupId)).toBe(true);
    expect(expanded.nodes.some((node) => node.id === groupId)).toBe(false);

    const unrelated = collapsed.nodes.filter((node) => node.id !== groupId).map((node) => node.id);
    const [before, after] = [tilesOf(collapsed), tilesOf(expanded)];
    for (const [index, a] of unrelated.entries()) {
      for (const b of unrelated.slice(index + 1)) {
        const was = Math.sign(before.get(a)!.x - before.get(b)!.x);
        const now = Math.sign(after.get(a)!.x - after.get(b)!.x);
        expect(now === was || now === 0 || was === 0, `${a} and ${b} swapped along the flow`).toBe(true);
      }
    }
  });
});

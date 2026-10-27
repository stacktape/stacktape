import { describe, expect, test } from 'bun:test';
import { assertDevStackReferencesResolve, findStreamTablesToDeploy } from './dev-stack-references';

// The r2w dogfood app in the shape that failed: a stream consumer, a function and a container using the table, a bus
// and a container that a frontend calls.
const resources = (overrides: Record<string, object> = {}) => ({
  mainTable: { type: 'dynamo-db-table', properties: { streamType: 'NEW_IMAGE' } },
  cache: { type: 'redis-cluster', properties: {} },
  shopEvents: { type: 'event-bus' },
  orderStream: {
    type: 'function',
    properties: {
      events: [
        { type: 'dynamo-db-stream', properties: { streamArn: "$ResourceParam('mainTable', 'streamArn')" } },
        { type: 'schedule', properties: { scheduleRate: 'rate(1 minute)' } }
      ],
      environment: [{ name: 'EVENT_BUS_NAME', value: "$ResourceParam('shopEvents','arn')" }]
    }
  },
  orderNotify: {
    type: 'function',
    properties: { environment: [{ name: 'ORDERS_TABLE', value: "$ResourceParam('mainTable', 'name')" }] }
  },
  ordersApi: {
    type: 'web-service',
    properties: {
      environment: [{ name: 'ORDERS_TABLE', value: "$ResourceParam('mainTable', 'name')" }],
      iamRoleStatements: [
        { Effect: 'Allow', Action: ['dynamodb:Scan'], Resource: ["$ResourceParam('mainTable', 'arn')"] }
      ]
    }
  },
  web: {
    type: 'nextjs-web',
    properties: { environment: [{ name: 'ORDERS_API_URL', value: "$ResourceParam('ordersApi', 'url')" }] }
  },
  ...overrides
});

const LOCAL_TABLE_PARAMS = ['name', 'arn', 'endpoint'];

const check = ({
  config = resources(),
  remote = [] as string[],
  skipped = [] as string[],
  relayed = { mainTable: LOCAL_TABLE_PARAMS } as Record<string, string[]>
} = {}) => {
  try {
    assertDevStackReferencesResolve({
      resources: config,
      remoteResourceNames: new Set(remote),
      skippedFunctionNames: new Set(skipped),
      relayedParamNames: new Map(Object.entries(relayed))
    });
    return undefined;
  } catch (error) {
    const { code, message, hints } = error as { code: string; message: string; hints?: string[] };
    return { code, message, hints };
  }
};

describe('tables that dev mode deploys for stream triggers', () => {
  const cases: { name: string; remote: string[]; skipped: string[]; expected: [string, string[]][] }[] = [
    {
      name: 'a local table read by a stream trigger',
      remote: [],
      skipped: [],
      expected: [['mainTable', ['orderStream']]]
    },
    { name: 'a table that is remote already', remote: ['mainTable'], skipped: [], expected: [] },
    { name: 'a stream trigger of a skipped function', remote: [], skipped: ['orderStream'], expected: [] }
  ];
  test.each(cases)('$name', ({ remote, skipped, expected }) => {
    const tables = findStreamTablesToDeploy({
      resources: resources(),
      remoteResourceNames: new Set(remote),
      skippedFunctionNames: new Set(skipped)
    });
    expect([...tables]).toEqual(expected);
  });
});

describe('dev stack references to resources it does not deploy', () => {
  test('resolve when the table is deployed or relayed, and skip what runs locally', () => {
    // The table deployed for the stream: everything resolves against it.
    expect(check({ remote: ['mainTable'] })).toBeUndefined();
    // A frontend's and a container's environment are resolved on the developer's machine.
    expect(check({ skipped: ['orderStream'] })).toBeUndefined();
  });

  test('a container role statement on a local table that no function relays names the path and the fix', () => {
    const error = check({ skipped: ['orderStream'], relayed: {} });
    expect(error?.code).toBe('DEV_LOCAL_RESOURCE_REFERENCED');
    expect(error?.message).toContain('`mainTable` runs locally in dev mode');
    expect(error?.message).toContain(
      "resources.ordersApi.properties.iamRoleStatements[0].Resource[0]: $ResourceParam('mainTable', 'arn')"
    );
    // The function's environment needs the relay too, which --no-tunnel turns off.
    expect(error?.message).toContain('resources.orderNotify.properties.environment[0].value');
    expect(error?.hints?.[0]).toContain('`--remote-resources mainTable`');
    expect(error?.hints?.[0]).toContain('`dev.remote: true`');
  });

  test('a parameter the relay does not give fails, though the function reaches the table', () => {
    const error = check({
      config: resources({
        orderNotify: {
          type: 'function',
          properties: {
            environment: [{ name: 'STREAM', value: "$Format('{}', $ResourceParam('mainTable','streamArn'))" }]
          }
        }
      }),
      skipped: ['orderStream']
    });
    expect(error?.code).toBe('DEV_LOCAL_RESOURCE_REFERENCED');
    expect(error?.message).toContain(
      "resources.orderNotify.properties.environment[0].value: $ResourceParam('mainTable', 'streamArn')"
    );
  });

  test('a deployed function cannot reference a container that runs on the machine', () => {
    const error = check({
      config: resources({
        orderNotify: {
          type: 'function',
          properties: { environment: [{ name: 'API', value: "$ResourceParam('ordersApi', 'url')" }] }
        }
      }),
      remote: ['mainTable']
    });
    expect(error?.code).toBe('DEV_LOCAL_RESOURCE_REFERENCED');
    expect(error?.message).toContain('`ordersApi` runs on your machine in dev mode');
    expect(error?.hints).toEqual([expect.stringContaining('Containers and frontends always run on your machine')]);
  });

  test.each([
    {
      name: 'a parameter the resource type does not have',
      value: "$ResourceParam('shopEvents', 'name')",
      code: 'DIRECTIVE_RESOURCE_PARAMETER_INVALID'
    },
    {
      name: 'a resource that does not exist',
      value: "$ResourceParam('ordersTable', 'name')",
      code: 'DIRECTIVE_RESOURCE_NOT_FOUND'
    }
  ])('$name fails before any AWS work', ({ value, code }) => {
    const error = check({
      config: resources({ orderStream: { type: 'function', properties: { environment: [{ name: 'X', value }] } } })
    });
    expect(error?.code).toBe(code);
  });
});

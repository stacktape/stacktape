import { describe, expect, test } from 'bun:test';
import { isSecretCfAttribute } from '@utils/referenceable-types';
import {
  assertDevStackReferencesResolve,
  assertNoLocalCfSecretReferences,
  findLocalCfResourceReferences,
  findMissingLocalCfResourceOutputs,
  findStreamTablesToDeploy
} from './dev-stack-references';

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

// The same app with a stream consumer that is not deployed in dev mode at all, so the table can stay local.
const withoutStream = (overrides: Record<string, object> = {}) =>
  resources({ orderStream: { type: 'function', properties: {} }, ...overrides });

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
    // Skipping the consumer must not delete the deployed table and its data.
    {
      name: 'a stream trigger of a skipped function',
      remote: [],
      skipped: ['orderStream'],
      expected: [['mainTable', ['orderStream']]]
    }
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
    expect(check({ config: withoutStream() })).toBeUndefined();
  });

  test('a container role statement on a local table that no function relays names the path and the fix', () => {
    const error = check({ config: withoutStream(), relayed: {} });
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
      config: withoutStream({
        orderNotify: {
          type: 'function',
          properties: {
            environment: [{ name: 'STREAM', value: "$Format('{}', $ResourceParam('mainTable','streamArn'))" }]
          }
        }
      })
    });
    expect(error?.code).toBe('DEV_LOCAL_RESOURCE_REFERENCED');
    expect(error?.message).toContain(
      "resources.orderNotify.properties.environment[0].value: $ResourceParam('mainTable', 'streamArn')"
    );
  });

  test('uptime checks, synthetic tests and alarms are left out of dev stacks, so their references are not checked', () => {
    const config = resources({
      apiUptime: { type: 'uptime-check', properties: { url: "$ResourceParam('ordersApi', 'url')" } },
      webFlow: {
        type: 'synthetic-test',
        properties: { environment: [{ name: 'URL', value: "$ResourceParam('web', 'url')" }] }
      },
      orderNotify: {
        type: 'function',
        properties: {
          alarms: [
            {
              notificationTargets: [{ type: 'email', properties: { recipient: "$ResourceParam('mainTable', 'arn')" } }]
            }
          ]
        }
      }
    });
    expect(check({ config, remote: ['mainTable'] })).toBeUndefined();
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

// r2qq finding 1: a raw Lambda that only a local Next.js app read resolved to `<<missing_output>>`: the dev template
// leaves the app out, so nothing added the stack output that local resolution reads.
describe('$CfResourceParam references of local workloads', () => {
  const config = {
    resources: {
      web: {
        type: 'nextjs-web',
        properties: {
          environment: [{ name: 'IMAGE_FUNCTION_NAME', value: "$CfResourceParam('ImageLambda', 'FunctionName')" }]
        }
      },
      api: {
        type: 'function',
        properties: { environment: [{ name: 'TOPIC', value: "$CfResourceParam('AlertTopic', 'TopicArn')" }] }
      },
      worker: {
        type: 'worker-service',
        properties: {
          containers: [
            { environment: [{ name: 'QUEUE', value: '$CfFormat(\'{}\', $CfResourceParam("Jobs", "Arn"))' }] }
          ]
        }
      }
    },
    scripts: {
      migrate: {
        type: 'local-script',
        properties: { environment: [{ name: 'BUCKET', value: "$CfResourceParam('Uploads', 'BucketName')" }] }
      },
      cleanup: {
        type: 'deployment-script',
        properties: { environment: [{ name: 'IGNORED', value: "$CfResourceParam('Deployed', 'Arn')" }] }
      }
    }
  };

  test('come from local containers, frontends and scripts, not from what the dev stack deploys', () => {
    expect(
      findLocalCfResourceReferences(config).map(({ referencer, resourceName, property }) => [
        referencer,
        resourceName,
        property
      ])
    ).toEqual([
      ['web', 'ImageLambda', 'FunctionName'],
      ['worker', 'Jobs', 'Arn'],
      ['migrate', 'Uploads', 'BucketName']
    ]);
  });

  test('a deployed resource without the output makes the dev stack update; one not deployed yet does not', () => {
    const references = findLocalCfResourceReferences(config);
    expect(
      findMissingLocalCfResourceOutputs({
        references,
        isDeployed: (name) => name !== 'Uploads',
        outputs: { JobsArn: 'arn:aws:sqs:eu-north-1:123456789012:jobs' }
      })
    ).toEqual(['ImageLambda.FunctionName']);
  });
});

// #386 review: a local script's $CfResourceParam of an access key's secret became a plaintext stack output.
describe('credentials of raw resources read by local workloads', () => {
  test('fail before any AWS work, naming the attribute and where it is referenced', () => {
    const references = findLocalCfResourceReferences({
      scripts: {
        migrate: {
          type: 'local-script',
          properties: { environment: [{ name: 'KEY', value: "$CfResourceParam('RawKey', 'SecretAccessKey')" }] }
        }
      }
    });
    let error: { code?: string; message?: string } | undefined;
    try {
      assertNoLocalCfSecretReferences({ references, resourceTypes: { RawKey: 'AWS::IAM::AccessKey' } });
    } catch (caught) {
      error = caught as typeof error;
    }
    expect(error?.code).toBe('DIRECTIVE_CF_RESOURCE_PARAM_SECRET');
    expect(error?.message).toContain('SecretAccessKey');
    expect(error?.message).toContain('scripts.migrate.properties.environment[0].value');
    expect(() => assertNoLocalCfSecretReferences({ references, resourceTypes: { RawKey: undefined } })).not.toThrow();
    const reader = findLocalCfResourceReferences({
      resources: {
        web: {
          type: 'nextjs-web',
          properties: { environment: [{ name: 'DB_URL', value: "$CfResourceParam('CredentialReader', 'value')" }] }
        }
      }
    });
    expect(() =>
      assertNoLocalCfSecretReferences({
        references: reader,
        resourceTypes: { CredentialReader: 'AWS::CloudFormation::CustomResource' }
      })
    ).toThrow(/custom resource attribute other than an ARN, ID or name/);
  });

  test('are the secret attributes of their types, and every custom resource attribute but ARNs, IDs and names', () => {
    const cases: [string, string, boolean][] = [
      ['AWS::IAM::AccessKey', 'SecretAccessKey', true],
      ['AWS::IAM::AccessKey', 'Id', false],
      ['AWS::Cognito::UserPoolClient', 'ClientSecret', true],
      ['AWS::Cognito::UserPoolClient', 'ClientId', false],
      ['AWS::AppSync::ApiKey', 'ApiKey', true],
      ['AWS::MediaPackage::Channel', 'HlsIngest.ingestEndpoints.0.Password', true],
      ['AWS::RDS::DBInstance', 'MasterUserSecret.SecretArn', false],
      ['AWS::Lambda::Function', 'FunctionName', false],
      ['AWS::CloudFormation::CustomResource', 'DbPassword', true],
      ['Custom::Atlas', 'ApiToken', true],
      // #386 re-review: Stacktape's ssmParameterRetrieve returns the decrypted parameter as `value`.
      ['AWS::CloudFormation::CustomResource', 'value', true],
      ['AWS::CloudFormation::CustomResource', 'Endpoint', true],
      ['AWS::CloudFormation::CustomResource', 'SecretArn', false],
      ['AWS::CloudFormation::CustomResource', 'Id', false],
      ['AWS::CloudFormation::CustomResource', 'DistributionName', false],
      ['AWS::CloudFormation::CustomResource', 'version', false]
    ];
    expect(cases.map(([type, attribute]) => isSecretCfAttribute(type, attribute))).toEqual(
      cases.map(([, , secret]) => secret)
    );
  });
});

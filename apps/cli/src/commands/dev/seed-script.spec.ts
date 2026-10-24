import { describe, expect, test } from 'bun:test';
import {
  findDeployedIdentifier,
  findNonLocalReferences,
  getDeployedDatabaseIdentifiers,
  getSeedScriptRefusal
} from './seed-script';

// A seed must never write to a deployed database. `db` runs locally in these cases; `mainDb` is the stage's deployed
// database, connected with remoteResources.
const local = ['db', 'cache'];
const localScript = (properties: Record<string, unknown>) => ({ type: 'local-script', properties });

describe('seed scripts that reference deployed resources are refused before they resolve', () => {
  const refused: Array<[string, Record<string, unknown>, string]> = [
    ['connectTo a deployed database', { connectTo: ['mainDb'], executeCommand: 'npm run seed' }, 'mainDb'],
    [
      'the Prisma $Format pattern',
      {
        environment: [
          { name: 'DATABASE_URL', value: "$Format('{}?schema=public', $ResourceParam('mainDb', 'connectionString'))" }
        ],
        executeCommand: 'npx prisma db seed'
      },
      "$ResourceParam('mainDb')"
    ],
    [
      'a directive inside the command',
      { executeCommand: "psql $ResourceParam('mainDb','connectionString') -f seed.sql" },
      "$ResourceParam('mainDb')"
    ],
    [
      'a directive in executeCommands',
      { executeCommands: ['echo start', 'psql "$ResourceParam("mainDb", "host")"'] },
      "$ResourceParam('mainDb')"
    ],
    [
      'CloudFormation attributes',
      { environment: [{ name: 'HOST', value: "$CfResourceParam('MainDbInstance', 'Endpoint.Address')" }] },
      '$CfResourceParam'
    ],
    [
      "another stack's outputs",
      { environment: [{ name: 'URL', value: "$StackOutput('prod-stack', 'DbUrl')" }] },
      '$StackOutput'
    ],
    [
      'a resource name that is itself a directive',
      { environment: [{ name: 'URL', value: "$ResourceParam($Var('target'), 'connectionString')" }] },
      '$ResourceParam(...)'
    ],
    [
      'a deployed workload',
      { environment: [{ name: 'API', value: "$ResourceParam('api', 'url')" }] },
      "$ResourceParam('api')"
    ],
    ['the role of a deployed workload', { assumeRoleOfResource: 'api', executeCommand: 'node seed.js' }, 'role of api']
  ];
  for (const [name, properties, mentioned] of refused) {
    test(name, () => {
      expect(getSeedScriptRefusal({ script: localScript(properties), localResourceNames: local })).toContain(mentioned);
    });
  }

  test('bastion scripts', () => {
    for (const type of ['bastion-script', 'local-script-with-bastion-tunneling']) {
      expect(
        getSeedScriptRefusal({ script: { type, properties: { connectTo: ['db'] } }, localResourceNames: local })
      ).toContain(type);
    }
  });

  test('references to local databases, also nested, are allowed', () => {
    const properties = {
      connectTo: ['db', 'cache'],
      environment: [
        { name: 'DATABASE_URL', value: "$Format('{}?schema=public', $ResourceParam('db', 'connectionString'))" },
        { name: 'REDIS', value: '$ResourceParam("cache", "host")' },
        { name: 'STAGE', value: '$Stage()' }
      ],
      executeCommand: "psql $ResourceParam('db','connectionString') -f seed.sql"
    };
    expect(getSeedScriptRefusal({ script: localScript(properties), localResourceNames: local })).toBeUndefined();
    expect(findNonLocalReferences(properties, local)).toEqual([]);
  });
});

describe('a resolved seed is refused when it contains the address of a deployed database', () => {
  const resources = {
    db: { resourceType: 'relational-database', referencableParams: { host: { value: 'localhost' } } },
    mainDb: {
      resourceType: 'relational-database',
      referencableParams: {
        host: { value: 'r2i-main.cxyz.ca-central-1.rds.amazonaws.com' },
        readerHost: { value: 'r2i-main.cluster-ro-cxyz.ca-central-1.rds.amazonaws.com' },
        port: { value: '5432' },
        dbName: { value: 'postgres' }
      }
    },
    events: {
      resourceType: 'dynamo-db-table',
      referencableParams: { name: { value: 'r2i-todos-r2i-events' }, arn: { value: 'arn:aws:dynamodb:x:1:table/t' } }
    },
    uploads: { resourceType: 'bucket', referencableParams: { name: { value: 'r2i-todos-r2i-uploads' } } }
  };
  const identifiers = getDeployedDatabaseIdentifiers(resources, ['db']);

  test('collects hosts and table identifiers of resources that do not run locally', () => {
    expect(identifiers.sort()).toEqual(
      [
        'arn:aws:dynamodb:x:1:table/t',
        'r2i-main.cluster-ro-cxyz.ca-central-1.rds.amazonaws.com',
        'r2i-main.cxyz.ca-central-1.rds.amazonaws.com',
        'r2i-todos-r2i-events'
      ].sort()
    );
  });

  const cases: Array<[string, unknown[], string | undefined]> = [
    [
      'a literal connection string',
      [['postgresql://R2I-MAIN.cxyz.ca-central-1.rds.amazonaws.com:5432/app'], []],
      'r2i-main.cxyz.ca-central-1.rds.amazonaws.com'
    ],
    [
      'a resolved command',
      [[], ['psql -h r2i-main.cxyz.ca-central-1.rds.amazonaws.com']],
      'r2i-main.cxyz.ca-central-1.rds.amazonaws.com'
    ],
    ['a deployed table name', [['r2i-todos-r2i-events'], []], 'r2i-todos-r2i-events'],
    ['local values only', [['postgresql://localhost:5432/postgres', '5432', 'postgres'], ['node seed.js']], undefined]
  ];
  for (const [name, values, expected] of cases) {
    test(name, () => expect(findDeployedIdentifier(values, identifiers)).toBe(expected));
  }
});

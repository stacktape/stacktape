import { describe, expect, test } from 'bun:test';
import { ALLOWED_MEMORY_VALUES_FOR_CPU } from '../src/container-workload-resources';
import { type RelationalDatabaseEngine, normalizeEngineType } from '../src/relational-database-engines';
import { STACKTAPE_RESOURCE_TYPES } from '../src/resource-types';
import { getStacktapeResourceDefinitions } from '../src/schema-inspection';
import { getPrettyResourceName } from '../src/resource-types';

describe('Fargate workload resource compatibility', () => {
  test('preserves every supported CPU and memory combination', () => {
    expect(ALLOWED_MEMORY_VALUES_FOR_CPU).toEqual({
      '0.25': [512, 1024, 2048],
      '0.5': [1024, 2048, 3072, 4096],
      '1': [2048, 3072, 4096, 5120, 6144, 7168, 8192],
      '2': [4096, 5120, 6144, 7168, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384],
      '4': [
        8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384, 17408, 18432, 19456, 20480, 21504, 22528, 23552,
        24576, 25600, 26624, 27648, 28672, 29696, 30720
      ],
      '8': [16384, 20480, 24576, 28672, 32768, 36864, 40960, 45056, 49152, 53248, 57344, 61440],
      '16': [32768, 40960, 49152, 57344, 65536, 73728, 81920, 90112, 98304, 106496, 114688, 122880]
    });
  });
});

describe('relational database engine normalization', () => {
  test.each([
    ['aurora-postgresql', 'aurora-postgresql'],
    ['aurora-postgresql-serverless', 'aurora-postgresql'],
    ['aurora-postgresql-serverless-v2', 'aurora-postgresql'],
    ['aurora-mysql', 'aurora-mysql'],
    ['aurora-mysql-serverless', 'aurora-mysql'],
    ['aurora-mysql-serverless-v2', 'aurora-mysql'],
    ['postgres', 'postgres'],
    ['mysql', 'mysql'],
    ['mariadb', 'mariadb'],
    ['oracle-ee', 'oracle-ee'],
    ['oracle-se2', 'oracle-se2'],
    ['sqlserver-ee', 'sqlserver-ee'],
    ['sqlserver-ex', 'sqlserver-ex'],
    ['sqlserver-se', 'sqlserver-se'],
    ['sqlserver-web', 'sqlserver-web']
  ] satisfies Array<[RelationalDatabaseEngine, ReturnType<typeof normalizeEngineType>]>)(
    'normalizes %s to %s',
    (engine, expected) => {
      expect(normalizeEngineType(engine)).toBe(expected);
    }
  );
});

describe('configuration schema inspection', () => {
  test('preserves resource count, forced order, and category assignments', () => {
    const resources = getStacktapeResourceDefinitions();

    expect(resources).toHaveLength(44);
    expect(new Set(STACKTAPE_RESOURCE_TYPES)).toEqual(new Set(resources.map(({ type }) => type)));
    expect(resources.slice(0, 3).map(({ type }) => type)).toEqual(['function', 'hosting-bucket', 'web-service']);
    expect(resources.find(({ type }) => type === 'relational-database')?.category).toBe('database-resource');
    expect(resources.find(({ type }) => type === 'user-auth-pool')?.category).toBe('security-resource');
    expect(resources.find(({ type }) => type === 'mongo-db-atlas-cluster')?.category).toBe('3rd-party-resource');
    expect(resources.find(({ type }) => type === 'bucket')?.category).toBe('other-resource');
  });

  test.each([
    ['RelationalDatabase', 'SQL database'],
    ['open-search-domain', 'OpenSearch (Elastic)'],
    ['AwsCdkConstruct', 'AWS CDK Construct'],
    ['sqs-queue', 'SQS Queue'],
    ['sns-topic', 'SNS Topic'],
    ['application-load-balancer', 'Load Balancer'],
    ['bastion', 'Bastion (Jump Host)']
  ])('preserves the pretty name for %s', (resourceName, expected) => {
    expect(getPrettyResourceName(resourceName)).toBe(expected);
  });

  test('returns each canonical schema definition unchanged', () => {
    for (const resource of getStacktapeResourceDefinitions()) {
      expect(resource.definition.properties.type.const).toBe(resource.type);
      expect(resource.definitionName).not.toBe('');
      expect(resource.description).not.toBe('');
    }
  });
});

import { afterAll, beforeAll, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PricingInfo } from './catalog';

type CommandInput = {
  RequestItems: Record<
    string,
    | {
        Keys: { productName: string }[];
      }
    | {
        PutRequest: { Item: { productName: string; prices: PricingInfo[string] } };
      }[]
  >;
};

class FakeBatchGetCommand {
  constructor(readonly input: CommandInput) {}
}

class FakeBatchWriteCommand {
  constructor(readonly input: CommandInput) {}
}

const commands: (FakeBatchGetCommand | FakeBatchWriteCommand)[] = [];

mock.module('@aws-sdk/lib-dynamodb', () => ({
  BatchGetCommand: FakeBatchGetCommand,
  BatchWriteCommand: FakeBatchWriteCommand,
  DynamoDBDocumentClient: {
    from: () => ({
      send: async (command: FakeBatchGetCommand | FakeBatchWriteCommand) => {
        commands.push(command);
        if (command instanceof FakeBatchGetCommand) {
          const [tableName, request] = Object.entries(command.input.RequestItems)[0];
          if (Array.isArray(request)) {
            throw new Error('BatchGet received write request items.');
          }
          return {
            Responses: {
              [tableName]: request.Keys.map(({ productName }) => ({
                productName,
                prices: {
                  'us-east-1': {
                    currency: 'USD',
                    pricePerUnit: productName.startsWith('EC2-instance') ? '0.01' : '0.005',
                    unit: 'Hrs'
                  }
                }
              }))
            }
          };
        }
        return {};
      }
    })
  }
}));

const { calculateFlatMonthlyCost } = await import('./catalog');
const { getCumulatedPriceInfoForStack } = await import('./estimator');
const {
  loadProductPricesIntoDynamoTable,
  parsePricingCsvFile,
  refreshPricingTable: refreshPricingTableInternal
} = await import('./internal/pricing');

let fixtureDirectory: string;

beforeAll(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), 'stacktape-pricing-'));
});

afterAll(async () => {
  await rm(fixtureDirectory, { force: true, recursive: true });
});

describe('catalog', () => {
  test('parses AWS CSV headers, product names, regions, and metadata', async () => {
    const fixturePath = join(fixtureDirectory, 'AmazonEC2.csv');
    await writeFile(
      fixturePath,
      [
        'format version',
        'disclaimer',
        'publication date',
        'version',
        'offer code',
        [
          'Service Code',
          'Product Family',
          'Instance Type',
          'Location Type',
          'Operating System',
          'Price Description',
          'Term Type',
          'Region Code',
          'Unit',
          'Price Per Unit',
          'Currency',
          'vCPU',
          'Memory',
          'Physical Processor'
        ].join(','),
        [
          'AmazonEC2',
          'Compute Instance',
          't4g.small',
          'AWS Region',
          'Linux',
          'Linux On Demand',
          'OnDemand',
          'eu-west-1',
          'Hrs',
          '0.0168',
          'USD',
          '2',
          '2 GiB',
          'AWS Graviton2'
        ].join(',')
      ].join('\n')
    );

    await expect(parsePricingCsvFile(fixturePath)).resolves.toEqual({
      'EC2-instance-t4g.small-Linux': {
        'eu-west-1': {
          ADDITIONAL_METADATA: {
            burstable: false,
            cpuArchitecture: 'ARM',
            memory: '2 GiB',
            vCpu: '2'
          },
          currency: 'USD',
          pricePerUnit: '0.0168',
          unit: 'Hrs'
        }
      }
    });
  });

  test('preserves hourly and monthly flat-price semantics', () => {
    expect(calculateFlatMonthlyCost({ currency: 'USD', pricePerUnit: '0.01', unit: 'Hrs' })).toBe(7.2);
    expect(calculateFlatMonthlyCost({ currency: 'USD', pricePerUnit: '12.5', unit: 'month' })).toBe(12.5);
  });

  test('handles quoted commas, escaped quotes, blank columns, and a multi-name RDS product', async () => {
    const fixturePath = join(fixtureDirectory, 'AmazonRDS.csv');
    await writeFile(
      fixturePath,
      [
        'format version',
        'disclaimer',
        'publication date',
        'version',
        'offer code',
        [
          'Service Code',
          'Product Family',
          'Location Type',
          'Purchase Option',
          'Database Engine',
          'Usage Type',
          'Volume Type',
          'Deployment Option',
          'Storage',
          'Price Description',
          'Region Code',
          'Unit',
          'Price Per Unit',
          'Currency'
        ].join(','),
        [
          'AmazonRDS',
          'Database Storage',
          'AWS Region',
          '',
          'Any',
          'Aurora:StorageUsage',
          'General Purpose-Aurora',
          'Single-AZ',
          '',
          '"Storage, with ""quoted"" detail"',
          'eu-central-1',
          'GB-Mo',
          '0.10',
          'USD'
        ].join(',')
      ].join('\n')
    );

    await expect(parsePricingCsvFile(fixturePath)).resolves.toEqual({
      'RDS-gp2-storage-aurora-mysql': {
        'eu-central-1': {
          currency: 'USD',
          pricePerUnit: '0.10',
          unit: 'GB-Mo'
        }
      },
      'RDS-gp2-storage-aurora-postgresql': {
        'eu-central-1': {
          currency: 'USD',
          pricePerUnit: '0.10',
          unit: 'GB-Mo'
        }
      }
    });
  });
});

describe('estimator', () => {
  test('maps a bastion to its EC2 products and accumulates hourly costs', async () => {
    commands.length = 0;
    const result = await getCumulatedPriceInfoForStack({
      dynamoDbTableName: 'pricing-table',
      region: 'us-east-1',
      stackConfig: {
        resources: {
          adminBastion: {
            type: 'bastion',
            properties: { instanceSize: 't3.micro' }
          }
        }
      }
    });

    expect(result.flatMonthlyCost).toBe(10.8);
    expect(result.resourcesBreakdown.adminBastion.priceInfo.costBreakdown).toHaveLength(2);
    expect(commands).toHaveLength(1);
    expect(commands[0].input).toEqual({
      RequestItems: {
        'pricing-table': {
          Keys: [{ productName: 'EC2-public-ip' }, { productName: 'EC2-instance-t3.micro-Linux' }]
        }
      }
    });
  });

  test('logs and skips an unsupported resource while retaining supported estimates', async () => {
    commands.length = 0;
    const consoleError = spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const result = await getCumulatedPriceInfoForStack({
        dynamoDbTableName: 'pricing-table',
        region: 'us-east-1',
        stackConfig: {
          resources: {
            adminBastion: {
              type: 'bastion',
              properties: { instanceSize: 't3.micro' }
            },
            notifications: {
              type: 'sns-topic'
            }
          }
        }
      });

      expect(result.flatMonthlyCost).toBe(10.8);
      expect(Object.keys(result.resourcesBreakdown)).toEqual(['adminBastion']);
      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(consoleError.mock.calls[0][0].message).toContain('sns-topic');
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('refresh', () => {
  test('downloads every dynamic offer and writes dynamic and static catalogs', async () => {
    const downloadedOfferCodes: string[] = [];
    const writtenCatalogs: PricingInfo[] = [];

    await refreshPricingTableInternal({
      downloadDirectory: 'unused-in-test',
      dynamoDbTableName: 'pricing-table',
      dependencies: {
        downloadPricing: async ({ awsServiceOfferCode }) => {
          downloadedOfferCodes.push(awsServiceOfferCode);
          return {
            [`downloaded-${awsServiceOfferCode}`]: {
              ALL_REGIONS: { currency: 'USD', pricePerUnit: '1', unit: 'Hrs' }
            }
          };
        },
        writePrices: async ({ prices }) => {
          writtenCatalogs.push(prices);
          return [];
        }
      }
    });

    expect(downloadedOfferCodes).toEqual([
      'AmazonECS',
      'AmazonEFS',
      'AmazonElastiCache',
      'AmazonEC2',
      'AmazonRDS',
      'AmazonES',
      'AmazonS3',
      'AmazonDynamoDB',
      'AmazonApiGateway',
      'AWSLambda'
    ]);
    expect(writtenCatalogs).toHaveLength(17);
    expect(Object.keys(writtenCatalogs[0])).toEqual(['downloaded-AmazonECS']);
    expect(writtenCatalogs.some((catalog) => 'Atlas-MongoDB-M2' in catalog)).toBe(true);
  });

  test('writes at most 25 DynamoDB items per command without changing the item shape', async () => {
    commands.length = 0;
    const prices = Object.fromEntries(
      Array.from({ length: 26 }, (_, index) => [
        `product-${index}`,
        { 'eu-west-1': { currency: 'USD', pricePerUnit: String(index), unit: 'Hrs' } }
      ])
    );

    await loadProductPricesIntoDynamoTable({ dynamoDbTableName: 'pricing-table', prices });

    const writeCommands = commands.filter((command) => command instanceof FakeBatchWriteCommand);
    expect(writeCommands).toHaveLength(2);
    expect(writeCommands[0].input.RequestItems['pricing-table']).toHaveLength(25);
    expect(writeCommands[1].input.RequestItems['pricing-table']).toEqual([
      {
        PutRequest: {
          Item: {
            prices: {
              'eu-west-1': { currency: 'USD', pricePerUnit: '25', unit: 'Hrs' }
            },
            productName: 'product-25'
          }
        }
      }
    ]);
  });
});

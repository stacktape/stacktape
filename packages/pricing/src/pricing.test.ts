import { afterAll, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { PricingInfo } from './catalog';

type StoredPrices = PricingInfo[string];

type CommandInput = {
  RequestItems: Record<
    string,
    | {
        Keys: { productName: string }[];
      }
    | {
        PutRequest: { Item: { productName: string; prices: StoredPrices } };
      }[]
  >;
};

class FakeBatchGetCommand {
  constructor(readonly input: CommandInput) {}
}

class FakeBatchWriteCommand {
  constructor(readonly input: CommandInput) {}
}

// An in-memory stand-in for the Console pricing table. Writes store the exact item shape and reads return it, so the
// refresh → table → estimator path runs through the same items production stores. `faults` makes DynamoDB leave the
// next requests unprocessed, which it does under throttling.
const tables = new Map<string, Map<string, StoredPrices>>();
const faults = { unprocessedReads: 0, unprocessedWrites: 0 };
const commands: (FakeBatchGetCommand | FakeBatchWriteCommand)[] = [];
const tableItems = (tableName: string) => {
  if (!tables.has(tableName)) {
    tables.set(tableName, new Map());
  }
  return tables.get(tableName)!;
};

mock.module('@aws-sdk/lib-dynamodb', () => ({
  BatchGetCommand: FakeBatchGetCommand,
  BatchWriteCommand: FakeBatchWriteCommand,
  DynamoDBDocumentClient: {
    from: () => ({
      send: async (command: FakeBatchGetCommand | FakeBatchWriteCommand) => {
        commands.push(command);
        const [tableName, request] = Object.entries(command.input.RequestItems)[0];
        if (command instanceof FakeBatchGetCommand) {
          if (Array.isArray(request)) {
            throw new Error('BatchGet received write request items.');
          }
          if (faults.unprocessedReads > 0) {
            faults.unprocessedReads--;
            return { Responses: { [tableName]: [] }, UnprocessedKeys: { [tableName]: request } };
          }
          const items = tableItems(tableName);
          return {
            Responses: {
              [tableName]: request.Keys.filter(({ productName }) => items.has(productName)).map(({ productName }) => ({
                productName,
                prices: structuredClone(items.get(productName))
              }))
            }
          };
        }
        if (!Array.isArray(request)) {
          throw new Error('BatchWrite received read keys.');
        }
        if (faults.unprocessedWrites > 0) {
          faults.unprocessedWrites--;
          return { UnprocessedItems: { [tableName]: request } };
        }
        for (const { PutRequest } of request) {
          tableItems(tableName).set(PutRequest.Item.productName, structuredClone(PutRequest.Item.prices));
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

// Rows copied verbatim from the AWS price list CSVs (publication dates are in each file's preamble). Only these offers
// have rows; every other offer contributes nothing, as for a region AWS does not list.
const PINNED_CATALOG_FILES: Record<string, string> = {
  AmazonEC2: join(import.meta.dir, 'fixtures', 'AmazonEC2.csv'),
  AmazonECS: join(import.meta.dir, 'fixtures', 'AmazonECS.csv'),
  AmazonEFS: join(import.meta.dir, 'fixtures', 'AmazonEFS.csv')
};
const PINNED_TABLE = 'pinned-pricing-table';
const HOURS_PER_MONTH = 24 * 30;

const loadPinnedCatalog = (dynamoDbTableName: string) =>
  refreshPricingTableInternal({
    downloadDirectory: 'unused-in-test',
    dynamoDbTableName,
    dependencies: {
      downloadPricing: async ({ awsServiceOfferCode }) =>
        PINNED_CATALOG_FILES[awsServiceOfferCode] ? parsePricingCsvFile(PINNED_CATALOG_FILES[awsServiceOfferCode]) : {},
      writePrices: loadProductPricesIntoDynamoTable
    }
  });

const pricedStack = {
  resources: {
    adminBastion: { type: 'bastion', properties: { instanceSize: 't3.micro' } },
    api: {
      type: 'web-service',
      properties: {
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/index.ts' } },
        resources: { cpu: 0.25, memory: 512 }
      }
    },
    sharedFiles: {
      type: 'efs-filesystem',
      properties: { throughputMode: 'provisioned', provisionedThroughputInMibps: 10 }
    }
  }
} as const;

const estimate = (stackConfig: object, region: string) => {
  const consoleError = spyOn(console, 'error').mockImplementation(() => undefined);
  return getCumulatedPriceInfoForStack({
    dynamoDbTableName: PINNED_TABLE,
    region,
    stackConfig: stackConfig as Parameters<typeof getCumulatedPriceInfoForStack>[0]['stackConfig']
  }).finally(() => consoleError.mockRestore());
};

let fixtureDirectory: string;

beforeAll(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), 'stacktape-pricing-'));
  await loadPinnedCatalog(PINNED_TABLE);
});

afterAll(async () => {
  await rm(fixtureDirectory, { force: true, recursive: true });
});

beforeEach(() => {
  commands.length = 0;
  faults.unprocessedReads = 0;
  faults.unprocessedWrites = 0;
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

  test('converts each catalog unit to a monthly price', () => {
    const cases: [unit: string, pricePerUnit: string, monthly: number][] = [
      ['Hrs', '0.01', 7.2],
      ['hours', '0.04048', 29.1456],
      ['hr', '0.005', 3.6],
      ['month', '12.5', 12.5],
      ['GB-Mo', '0.30', 0.3],
      ['MiBps-Mo', '6.00', 6],
      ['GB-months', '0.085', 0.085]
    ];
    for (const [unit, pricePerUnit, monthly] of cases) {
      expect(calculateFlatMonthlyCost({ currency: 'USD', pricePerUnit, unit })).toBeCloseTo(monthly, 10);
    }
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

  test('maps real AWS rows to the products the estimator requests', async () => {
    const ec2 = await parsePricingCsvFile(PINNED_CATALOG_FILES.AmazonEC2);
    expect(ec2['EC2-instance-t3.micro-Linux']['us-east-1'].pricePerUnit).toBe('0.0104000000');
    expect(ec2['EC2-instance-t3.micro-Linux']['eu-west-1'].pricePerUnit).toBe('0.0114000000');
    // The Dedicated-tenancy row follows the On Demand row in the fixture and must not replace it.
    expect(ec2['EC2-instance-m5.large-Linux']['eu-west-1'].pricePerUnit).toBe('0.1070000000');

    const ecs = await parsePricingCsvFile(PINNED_CATALOG_FILES.AmazonECS);
    expect(Object.keys(ecs).toSorted()).toEqual(['ECS-cpu-AMD64-Linux', 'ECS-memory-AMD64-Linux']);

    const efs = await parsePricingCsvFile(PINNED_CATALOG_FILES.AmazonEFS);
    expect(efs).toEqual({
      'EFS-storage': { 'us-east-1': { currency: 'USD', pricePerUnit: '0.3000000000', unit: 'GB-Mo' } },
      'EFS-elastic-reads': { 'us-east-1': { currency: 'USD', pricePerUnit: '0.0300000000', unit: 'GB' } },
      'EFS-elastic-writes': { 'us-east-1': { currency: 'USD', pricePerUnit: '0.0600000000', unit: 'GB' } },
      'EFS-provisioned-throughput': { 'us-east-1': { currency: 'USD', pricePerUnit: '6.0000000000', unit: 'MiBps-Mo' } }
    });
  });

  test('every static price is a positive USD number with a unit', async () => {
    const written: PricingInfo[] = [];
    await refreshPricingTableInternal({
      downloadDirectory: 'unused-in-test',
      dynamoDbTableName: 'static-prices',
      dependencies: {
        downloadPricing: async () => ({}),
        writePrices: async ({ prices }) => {
          written.push(prices);
          return [];
        }
      }
    });
    const staticPrices = written.flatMap((catalog) =>
      Object.entries(catalog).flatMap(([productName, regions]) =>
        Object.values(regions).map((price) => Object.assign({ productName }, price))
      )
    );
    expect(staticPrices.length).toBeGreaterThan(20);
    for (const { productName, currency, pricePerUnit, unit } of staticPrices) {
      expect({ productName, currency, valid: Number(pricePerUnit) > 0, unit: Boolean(unit) }).toEqual({
        productName,
        currency: 'USD',
        valid: true,
        unit: true
      });
    }
  });
});

describe('estimator', () => {
  test('prices a stack completely from the pinned catalog in a listed region', async () => {
    const result = await estimate(pricedStack, 'us-east-1');

    const bastion = 0.005 * HOURS_PER_MONTH + 0.0104 * HOURS_PER_MONTH;
    const webService = 0.04048 * HOURS_PER_MONTH * 0.25 + 0.004445 * HOURS_PER_MONTH * 0.5 + 0.005 * HOURS_PER_MONTH;
    const fileSystem = 6 * 10;
    expect(result.incomplete).toBe(false);
    expect(result.unpricedResources).toEqual([]);
    expect(Object.keys(result.resourcesBreakdown)).toEqual(['adminBastion', 'api', 'sharedFiles']);
    expect(result.resourcesBreakdown.adminBastion.priceInfo.totalMonthlyFlat).toBeCloseTo(bastion, 10);
    expect(result.resourcesBreakdown.api.priceInfo.totalMonthlyFlat).toBeCloseTo(webService, 10);
    expect(result.resourcesBreakdown.sharedFiles.priceInfo.totalMonthlyFlat).toBeCloseTo(fileSystem, 10);
    expect(result.flatMonthlyCost).toBeCloseTo(bastion + webService + fileSystem, 10);

    // A pay-per-use rate missing from the catalog (HTTP API requests here) is reported but does not change the fixed
    // monthly total.
    const httpApiRequests = result.resourcesBreakdown.api.priceInfo.costBreakdown.find(
      ({ name }) => name === 'ApiGateway-http-api-requests'
    );
    expect(httpApiRequests).toMatchObject({ priceModel: 'pay-per-use', unsupportedProduct: true });
    expect(result.resourcesBreakdown.api.priceInfo.incomplete).toBe(false);

    expect(commands.filter((command) => command instanceof FakeBatchGetCommand)).toHaveLength(3);
  });

  test('uses the regional price, not another region or tenancy', async () => {
    const result = await estimate(
      { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 'm5.large' } } } },
      'eu-west-1'
    );
    expect(result.incomplete).toBe(false);
    expect(result.flatMonthlyCost).toBeCloseTo((0.005 + 0.107) * HOURS_PER_MONTH, 10);
  });

  test('marks a stack incomplete when a region has no price for a fixed-cost product', async () => {
    const result = await estimate(pricedStack, 'eu-central-1');

    expect(result.incomplete).toBe(true);
    expect(result.unpricedResources).toEqual([]);
    const { adminBastion, api, sharedFiles } = result.resourcesBreakdown;
    expect(adminBastion.priceInfo.incomplete).toBe(true);
    expect(adminBastion.priceInfo.costBreakdown).toEqual([
      expect.objectContaining({ name: 'EC2-public-ip', pricePerMonth: 0.005 * HOURS_PER_MONTH }),
      {
        name: 'EC2-instance-t3.micro-Linux',
        description: 'Price for EC2 instances',
        priceModel: 'flat',
        unsupportedProduct: true
      }
    ]);
    expect(api.priceInfo.incomplete).toBe(true);
    expect(sharedFiles.priceInfo.incomplete).toBe(true);
    // The total holds only what could be priced: the public IPs, whose price applies in every region.
    expect(result.flatMonthlyCost).toBeCloseTo(2 * 0.005 * HOURS_PER_MONTH, 10);
  });

  test('lists resources it cannot price and keeps the estimates it can', async () => {
    const result = await estimate(
      {
        resources: {
          adminBastion: { type: 'bastion', properties: { instanceSize: 't3.micro' } },
          notifications: { type: 'sns-topic' }
        }
      },
      'us-east-1'
    );

    expect(result.incomplete).toBe(true);
    expect(result.unpricedResources).toEqual(['notifications']);
    expect(Object.keys(result.resourcesBreakdown)).toEqual(['adminBastion']);
    expect(result.flatMonthlyCost).toBeCloseTo((0.005 + 0.0104) * HOURS_PER_MONTH, 10);
  });

  test('does not add a price in another currency to a USD total', async () => {
    tableItems(PINNED_TABLE).set('EC2-instance-t3.nano-Linux', {
      'us-east-1': { currency: 'CNY', pricePerUnit: '0.04', unit: 'Hrs' }
    });
    const result = await estimate(
      { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 't3.nano' } } } },
      'us-east-1'
    );
    expect(result.incomplete).toBe(true);
    expect(result.flatMonthlyCost).toBeCloseTo(0.005 * HOURS_PER_MONTH, 10);
  });

  test('retries price reads that DynamoDB leaves unprocessed', async () => {
    faults.unprocessedReads = 1;
    const result = await estimate(
      { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 't3.micro' } } } },
      'us-east-1'
    );
    expect(result.incomplete).toBe(false);
    expect(result.flatMonthlyCost).toBeCloseTo((0.005 + 0.0104) * HOURS_PER_MONTH, 10);
    expect(commands).toHaveLength(2);
  });

  test('reports a stack as unpriced, not free, when prices cannot be read', async () => {
    faults.unprocessedReads = 100;
    const result = await estimate(pricedStack, 'us-east-1');
    expect(result.incomplete).toBe(true);
    expect(result.flatMonthlyCost).toBe(0);
    for (const resource of Object.values(result.resourcesBreakdown)) {
      expect(resource.priceInfo.incomplete).toBe(true);
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
    const prices = Object.fromEntries(
      Array.from({ length: 26 }, (_, index) => [
        `product-${index}`,
        { 'eu-west-1': { currency: 'USD', pricePerUnit: String(index), unit: 'Hrs' } }
      ])
    );

    await loadProductPricesIntoDynamoTable({ dynamoDbTableName: 'batch-table', prices });

    const writeCommands = commands.filter((command) => command instanceof FakeBatchWriteCommand);
    expect(writeCommands).toHaveLength(2);
    expect(writeCommands[0].input.RequestItems['batch-table']).toHaveLength(25);
    expect(writeCommands[1].input.RequestItems['batch-table']).toEqual([
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

  test('retries items DynamoDB leaves unprocessed and fails when they are never written', async () => {
    const prices = { 'product-retried': { 'eu-west-1': { currency: 'USD', pricePerUnit: '1', unit: 'Hrs' } } };

    faults.unprocessedWrites = 1;
    await loadProductPricesIntoDynamoTable({ dynamoDbTableName: 'retry-table', prices });
    expect(tableItems('retry-table').get('product-retried')).toEqual(prices['product-retried']);

    faults.unprocessedWrites = 100;
    await expect(loadProductPricesIntoDynamoTable({ dynamoDbTableName: 'lost-table', prices })).rejects.toThrow(
      '1 pricing item'
    );
    expect(tableItems('lost-table').size).toBe(0);
  });
});

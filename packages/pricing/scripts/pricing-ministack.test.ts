import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { CreateTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import { getCumulatedPriceInfoForStack } from '../src/estimator';
import {
  loadProductPricesIntoDynamoTable,
  parsePricingCsvFile,
  refreshPricingTable as refreshPricingTableInternal
} from '../src/internal/pricing';
import type { PricingInfo } from '../src/catalog';
let ministack: MiniStack;
let documentClient: DynamoDBDocumentClient;
const environment = { ...process.env };
const faults = { unprocessedReads: 0, unprocessedWrites: 0, injectedReadFaults: 0 };
// Deliberate throttling is the only substituted DynamoDB behavior. All successful reads and writes go to MiniStack.
const proxy = createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    const input = JSON.parse(body.toString());
    const operation = String(req.headers['x-amz-target']).split('.').at(-1);
    res.setHeader('content-type', 'application/x-amz-json-1.0');
    if (operation === 'BatchGetItem' && faults.unprocessedReads-- > 0) {
      faults.injectedReadFaults++;
      res.end(JSON.stringify({ Responses: {}, UnprocessedKeys: input.RequestItems }));
    } else if (operation === 'BatchWriteItem' && faults.unprocessedWrites-- > 0) {
      res.end(JSON.stringify({ UnprocessedItems: input.RequestItems }));
    } else {
      const response = await fetch(ministack.endpoint, {
        method: 'POST',
        body,
        headers: Object.fromEntries(
          Object.entries(req.headers)
            .filter(([key]) => !['host', 'connection', 'content-length'].includes(key))
            .map(([key, value]) => [key, String(value)])
        )
      });
      res.statusCode = response.status;
      res.end(Buffer.from(await response.arrayBuffer()));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error));
  }
});
const putPrice = (productName: string, prices: PricingInfo[string]) =>
  documentClient.send(new PutCommand({ TableName: PINNED_TABLE, Item: { productName, prices } }));
// Rows copied verbatim from the AWS price list CSVs (publication dates are in each file's preamble). Only these offers
// have rows; every other offer contributes nothing, as for a region AWS does not list.
const PINNED_CATALOG_FILES: Record<string, string> = {
  AmazonEC2: join(import.meta.dir, '../src/fixtures', 'AmazonEC2.csv'),
  AmazonECS: join(import.meta.dir, '../src/fixtures', 'AmazonECS.csv'),
  AmazonEFS: join(import.meta.dir, '../src/fixtures', 'AmazonEFS.csv'),
  AmazonApiGateway: join(import.meta.dir, '../src/fixtures', 'AmazonApiGateway.csv')
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
    elasticFiles: { type: 'efs-filesystem', properties: { throughputMode: 'elastic' } },
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

beforeAll(async () => {
  ministack = await startMiniStack({ label: 'pricing' });
  Object.assign(process.env, ministack.childEnvironment());
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  process.env.AWS_ENDPOINT_URL_DYNAMODB = `http://127.0.0.1:${(proxy.address() as { port: number }).port}`;
  const dynamo = new DynamoDBClient(ministack.clientConfig());
  documentClient = DynamoDBDocumentClient.from(dynamo);
  await dynamo.send(
    new CreateTableCommand({
      TableName: PINNED_TABLE,
      KeySchema: [{ AttributeName: 'productName', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'productName', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST'
    })
  );
  await loadPinnedCatalog(PINNED_TABLE);
}, 120_000);
afterAll(async () => {
  try {
    if (proxy.listening)
      await new Promise<void>((resolve, reject) =>
        proxy.close((error) => {
          if (error) reject(error);
          else resolve();
        })
      );
    documentClient?.destroy();
  } finally {
    await ministack?.stop();
    for (const key of Object.keys(process.env)) if (!(key in environment)) delete process.env[key];
    Object.assign(process.env, environment);
  }
});
beforeEach(() => {
  faults.unprocessedReads = 0;
  faults.unprocessedWrites = 0;
  faults.injectedReadFaults = 0;
});
describe('estimator', () => {
  test('prices a stack completely from the pinned catalog in a listed region', async () => {
    const result = await estimate(pricedStack, 'us-east-1');

    const bastion = 0.005 * HOURS_PER_MONTH + 0.0104 * HOURS_PER_MONTH;
    const webService = 0.04048 * HOURS_PER_MONTH * 0.25 + 0.004445 * HOURS_PER_MONTH * 0.5 + 0.005 * HOURS_PER_MONTH;
    const fileSystem = 6 * 10;
    expect(result.incomplete).toBe(false);
    expect(result.unpricedResources).toEqual([]);
    expect(result.resourcesBreakdown.adminBastion.priceInfo.totalMonthlyFlat).toBeCloseTo(bastion, 10);
    expect(result.resourcesBreakdown.api.priceInfo.totalMonthlyFlat).toBeCloseTo(webService, 10);
    expect(result.resourcesBreakdown.sharedFiles.priceInfo.totalMonthlyFlat).toBeCloseTo(fileSystem, 10);
    expect(result.flatMonthlyCost).toBeCloseTo(bastion + webService + fileSystem, 10);
    expect(result.resourcesBreakdown.elasticFiles.priceInfo.costBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'EFS-storage', priceModel: 'pay-per-use', pricePerUnit: 0.3 }),
        expect.objectContaining({ name: 'EFS-elastic-reads', priceModel: 'pay-per-use', pricePerUnit: 0.03 }),
        expect.objectContaining({ name: 'EFS-elastic-writes', priceModel: 'pay-per-use', pricePerUnit: 0.06 })
      ])
    );

    const httpApiRequests = result.resourcesBreakdown.api.priceInfo.costBreakdown.find(
      ({ name }) => name === 'ApiGateway-http-api-requests'
    );
    expect(httpApiRequests).toMatchObject({ priceModel: 'pay-per-use', pricePerUnit: 0.000001 });
    expect(httpApiRequests?.unsupportedProduct).toBeUndefined();
  });

  test('a load balancer pays for two public IPs and a scaled service for every minimum instance', async () => {
    await putPrice('EC2-load-balancer-application', {
      'us-east-1': { currency: 'USD', pricePerUnit: '0.0225', unit: 'Hrs' }
    });
    await putPrice('EC2-load-balancer-lcu-application', {
      'us-east-1': { currency: 'USD', pricePerUnit: '0.008', unit: 'LCU-Hrs' }
    });
    const result = await estimate(
      {
        resources: {
          balancer: { type: 'application-load-balancer' },
          scaledApi: {
            type: 'web-service',
            properties: {
              packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/index.ts' } },
              resources: { cpu: 0.25, memory: 512 },
              scaling: { minInstances: 3, maxInstances: 5 }
            }
          }
        }
      },
      'us-east-1'
    );
    expect(result.incomplete).toBe(false);
    expect(result.resourcesBreakdown.balancer.priceInfo.totalMonthlyFlat).toBeCloseTo(
      (0.0225 + 2 * 0.005) * HOURS_PER_MONTH,
      10
    );
    expect(result.resourcesBreakdown.scaledApi.priceInfo.totalMonthlyFlat).toBeCloseTo(
      3 * (0.04048 * 0.25 + 0.004445 * 0.5 + 0.005) * HOURS_PER_MONTH,
      10
    );
  });

  test('missing pay-per-use rates cannot turn a function into a complete zero-cost estimate', async () => {
    const result = await estimate(
      {
        resources: {
          api: {
            type: 'function',
            properties: { memory: 128, packaging: { type: 'js-bundle', properties: { entryfilePath: 'index.ts' } } }
          }
        }
      },
      'us-east-1'
    );
    expect(result.flatMonthlyCost).toBe(0);
    expect(result.incomplete).toBe(true);
    expect(result.resourcesBreakdown.api.priceInfo.incomplete).toBe(true);
    expect(result.resourcesBreakdown.api.priceInfo.costBreakdown.length).toBeGreaterThan(0);
    expect(
      result.resourcesBreakdown.api.priceInfo.costBreakdown.every(
        ({ priceModel, unsupportedProduct }) => priceModel === 'pay-per-use' && unsupportedProduct
      )
    ).toBe(true);
  });

  test('uses the regional price, not another region or tenancy', async () => {
    const result = await estimate(
      { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 'm5.large' } } } },
      'eu-west-1'
    );
    expect(result.incomplete).toBe(false);
    expect(result.flatMonthlyCost).toBeCloseTo((0.005 + 0.107) * HOURS_PER_MONTH, 10);
    const micro = await estimate(
      { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 't3.micro' } } } },
      'eu-west-1'
    );
    expect(micro.incomplete).toBe(false);
    expect(micro.flatMonthlyCost).toBeCloseTo((0.005 + 0.0114) * HOURS_PER_MONTH, 10);
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

  test('prices the stack-level NAT: gateways from the static catalog, instances from EC2, nothing without a consumer', async () => {
    const worker = {
      type: 'worker-service',
      properties: {
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/worker.ts' } },
        resources: { cpu: 0.25, memory: 512 },
        usePrivateSubnetsWithNAT: true
      }
    };
    const vpcFunction = {
      type: 'function',
      properties: {
        packaging: { type: 'js-bundle', properties: { entryfilePath: 'src/api.ts' } },
        joinDefaultVpc: true
      }
    };

    // Two gateways and two public IPs, both static USD products of the refresh.
    const gateways = await estimate({ stackConfig: { nat: 'gateway' }, resources: { worker } }, 'us-east-1');
    expect(gateways.resourcesBreakdown['vpc nat'].priceInfo.totalMonthlyFlat).toBeCloseTo(
      (0.045 + 0.005) * 2 * HOURS_PER_MONTH,
      10
    );
    expect(gateways.resourcesBreakdown['vpc nat'].customComment).toContain('2 NAT Gateways');

    // One instance for `ec2`, priced like any EC2 instance once its size is in the catalog.
    await putPrice('EC2-instance-t4g.nano-Linux', {
      'us-east-1': { currency: 'USD', pricePerUnit: '0.0042', unit: 'Hrs' }
    });
    const single = await estimate({ stackConfig: { nat: 'ec2' }, resources: { api: vpcFunction } }, 'us-east-1');
    expect(single.resourcesBreakdown['vpc nat'].priceInfo.totalMonthlyFlat).toBeCloseTo(
      (0.0042 + 0.005) * HOURS_PER_MONTH,
      10
    );
    expect(single.resourcesBreakdown['vpc nat'].customComment).toContain('1 NAT instance');

    // A VPC function alone is not a consumer until `nat` is set, and a reused VPC brings its own NAT.
    const unset = await estimate({ resources: { api: vpcFunction } }, 'us-east-1');
    expect(unset.resourcesBreakdown['vpc nat']).toBeUndefined();
    const reused = await estimate(
      { stackConfig: { nat: 'ha-ec2', vpc: { reuseVpc: { vpcId: 'vpc-1' } } }, resources: { worker } },
      'us-east-1'
    );
    expect(reused.resourcesBreakdown['vpc nat']).toBeUndefined();
  });

  test('does not add a price in another currency to a USD total', async () => {
    await putPrice('EC2-instance-t3.nano-Linux', {
      'us-east-1': { currency: 'CNY', pricePerUnit: '0.04', unit: 'Hrs' }
    });
    const result = await estimate(
      { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 't3.nano' } } } },
      'us-east-1'
    );
    expect(result.incomplete).toBe(true);
    expect(result.flatMonthlyCost).toBeCloseTo(0.005 * HOURS_PER_MONTH, 10);
  });

  test('invalid fixed rates remain unavailable while an explicit zero rate is valid', async () => {
    for (const [pricePerUnit, unit] of [
      ['', 'Hrs'],
      ['NaN', 'Hrs'],
      ['-1', 'Hrs'],
      ['1', 'Requests']
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- replace one shared product before estimating each rule case.
      await putPrice('EC2-instance-t3.nano-Linux', {
        'us-east-1': { currency: 'USD', pricePerUnit, unit }
      });
      // oxlint-disable-next-line eslint/no-await-in-loop -- each case replaces the same catalog product before reading it
      const result = await estimate(
        { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 't3.nano' } } } },
        'us-east-1'
      );
      expect(result.incomplete).toBe(true);
      expect(result.flatMonthlyCost).toBeCloseTo(3.6, 10);
    }
    await putPrice('EC2-instance-t3.nano-Linux', {
      'us-east-1': { currency: 'USD', pricePerUnit: '0', unit: 'Hrs' }
    });
    const free = await estimate(
      { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 't3.nano' } } } },
      'us-east-1'
    );
    expect(free.incomplete).toBe(false);
    expect(free.flatMonthlyCost).toBeCloseTo(3.6, 10);
  });

  test('retries price reads that DynamoDB leaves unprocessed', async () => {
    faults.unprocessedReads = 1;
    const result = await estimate(
      { resources: { adminBastion: { type: 'bastion', properties: { instanceSize: 't3.micro' } } } },
      'us-east-1'
    );
    expect(result.incomplete).toBe(false);
    expect(result.flatMonthlyCost).toBeCloseTo((0.005 + 0.0104) * HOURS_PER_MONTH, 10);
    expect(faults.injectedReadFaults).toBe(1);
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

test('a refresh stores regional prices and batches more than 25 products without losing items', async () => {
  const prices: PricingInfo = Object.fromEntries(
    Array.from({ length: 26 }, (_, index) => [
      `product-${index}`,
      { 'eu-west-1': { currency: 'USD', pricePerUnit: String(index), unit: 'Hrs' } }
    ])
  );
  await loadProductPricesIntoDynamoTable({ dynamoDbTableName: PINNED_TABLE, prices });
  const stored = await documentClient.send(new ScanCommand({ TableName: PINNED_TABLE }));
  for (const [productName, regionalPrices] of Object.entries(prices))
    expect(stored.Items).toContainEqual({ productName, prices: regionalPrices });
});
test('throttled writes eventually persist, while exhausted retries leave no apparent price', async () => {
  const prices = { 'product-retried': { 'eu-west-1': { currency: 'USD', pricePerUnit: '1', unit: 'Hrs' } } };
  faults.unprocessedWrites = 1;
  await loadProductPricesIntoDynamoTable({ dynamoDbTableName: PINNED_TABLE, prices });
  expect(
    (await documentClient.send(new GetCommand({ TableName: PINNED_TABLE, Key: { productName: 'product-retried' } })))
      .Item
  ).toEqual({ productName: 'product-retried', prices: prices['product-retried'] });
  faults.unprocessedWrites = 100;
  await expect(
    loadProductPricesIntoDynamoTable({
      dynamoDbTableName: PINNED_TABLE,
      prices: { 'product-lost': prices['product-retried'] }
    })
  ).rejects.toThrow('1 pricing item');
  expect(
    (await documentClient.send(new GetCommand({ TableName: PINNED_TABLE, Key: { productName: 'product-lost' } }))).Item
  ).toBeUndefined();
});

// Independently named/rated offers let a removed refresh entry show up as missing stored customer pricing.
test('refresh retains every dynamic offer and every static product as a usable USD catalog row', async () => {
  const table = 'full-offer-pricing';
  await documentClient.send(
    new CreateTableCommand({
      TableName: table,
      KeySchema: [{ AttributeName: 'productName', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'productName', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST'
    })
  );
  await refreshPricingTableInternal({
    dynamoDbTableName: table,
    downloadDirectory: 'unused-in-test',
    dependencies: {
      downloadPricing: ({ awsServiceOfferCode }) =>
        parsePricingCsvFile(
          PINNED_CATALOG_FILES[awsServiceOfferCode] ??
            join(import.meta.dir, '../src/fixtures', `${awsServiceOfferCode}-refresh.csv`)
        ),
      writePrices: loadProductPricesIntoDynamoTable
    }
  });
  const stored = (await documentClient.send(new ScanCommand({ TableName: table }))).Items!;
  const dynamic: Record<string, [string, string]> = {
    'EC2-instance-t3.micro-Linux': ['0.0104000000', 'Hrs'],
    'ECS-cpu-AMD64-Linux': ['0.0404800000', 'hours'],
    'EFS-storage': ['0.3000000000', 'GB-Mo'],
    'ApiGateway-http-api-requests': ['0.0000010000', 'Requests'],
    'ElastiCache-instance-cache.t4g.micro': ['0.02', 'Hrs'],
    'RDS-instance-db.t4g.micro-postgres': ['0.03', 'Hrs'],
    'OpenSearch-instance-t3.small.search': ['0.04', 'Hrs'],
    'S3-storage': ['0.023', 'GB-Mo'],
    'DynamoDB-storage': ['0.25', 'GB-Mo'],
    'Lambda-price-per-request': ['0.0000002', 'Requests']
  };
  const staticPrices: Record<string, [string, string]> = {
    'Atlas-MongoDB-M2': ['0.0125', 'hr'],
    'Atlas-MongoDB-M5': ['0.034', 'hr'],
    'Atlas-MongoDB-M10': ['0.08', 'hr'],
    'Atlas-MongoDB-M20': ['0.20', 'hr'],
    'Atlas-MongoDB-M30': ['0.54', 'hr'],
    'Atlas-MongoDB-M40': ['1.04', 'hr'],
    'Atlas-MongoDB-M50': ['2.00', 'hr'],
    'Atlas-MongoDB-M60': ['3.95', 'hr'],
    'Atlas-MongoDB-M80': ['7.30', 'hr'],
    'Atlas-MongoDB-M140': ['10.99', 'hr'],
    'Atlas-MongoDB-M200': ['14.59', 'hr'],
    'Atlas-MongoDB-M300': ['21.85', 'hr'],
    'Atlas-MongoDB-M400': ['22.40', 'hr'],
    'Atlas-MongoDB-M700': ['33.26', 'hr'],
    'WAF-firewall': ['0.007', 'hr'],
    'WAF-firewall-rule': ['0.0013', 'hr'],
    'WAF-firewall-requests': ['0.6', 'per million requests'],
    'Events-published-messages': ['1.0', '1M requests'],
    'CloudFront-price-per-10000-req': ['0.009', '10,000 requests'],
    'UpstashRedis-price-per-100k-commands': ['0.2', '100,000 commands'],
    'Cognito-mau': ['0.0055', '1 mau'],
    'EC2-public-ip': ['0.005', 'hr']
  };
  for (const [region, prices] of [
    ['us-east-1', dynamic],
    ['ALL_REGIONS', staticPrices]
  ] as const)
    for (const [productName, [pricePerUnit, unit]] of Object.entries(prices))
      expect(stored).toContainEqual(
        expect.objectContaining({
          productName,
          prices: expect.objectContaining({
            [region]: expect.objectContaining({ currency: 'USD', pricePerUnit, unit })
          })
        })
      );
});

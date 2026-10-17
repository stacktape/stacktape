import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { calculateFlatMonthlyCost } from './catalog';
import { parsePricingCsvFile } from './internal/pricing';
let fixtureDirectory: string;
beforeAll(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), 'stacktape-pricing-csv-'));
});
afterAll(async () => {
  await rm(fixtureDirectory, { force: true, recursive: true });
});
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

import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { cloudformationRegistryManager } from './index';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { operationReporter } from '@application-services/operation-manager';
import { resetDomainServiceInitialization } from '@utils/decorators';

beforeEach(() => {
  resetDomainServiceInitialization();
  operationReporter.setSilentMode(true);
  awsSdkManager.init({ credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, region: 'eu-west-1' });
});

afterEach(() => {
  mock.restore();
});

const registryReads = () => ({
  registeredTypes: spyOn(awsSdkManager.cloudFormationRegistry, 'listTypesWithVersions').mockResolvedValue({}),
  packages: spyOn(awsSdkManager.s3, 'listObjects').mockResolvedValue([])
});

test('a stack that needs no private type never lists the registry or its package bucket', async () => {
  const reads = registryReads();
  await cloudformationRegistryManager.registerLatestCfPrivateTypes([]);
  expect(reads.registeredTypes).not.toHaveBeenCalled();
  expect(reads.packages).not.toHaveBeenCalled();
});

test('a stack that needs a private type reads the registry and the package bucket', async () => {
  const reads = registryReads();
  reads.packages.mockResolvedValue([{ Key: 'upstashRedis/V1/0000020/upstash-databasesv1-database.zip' }] as never);
  await cloudformationRegistryManager.loadPrivateTypesAndPackages(['upstashRedis']);
  expect(reads.registeredTypes).toHaveBeenCalledTimes(1);
  expect(reads.packages).toHaveBeenCalledTimes(1);
});

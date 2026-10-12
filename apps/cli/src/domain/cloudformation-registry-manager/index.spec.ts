import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { cloudformationRegistryManager } from './index';
import { SUPPORTED_CF_INFRASTRUCTURE_MODULES } from '@config';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { cfRegistryNames } from './names';
import type { StpCfInfrastructureModuleType } from './types';

beforeEach(() => {
  awsSdkManager.init({ credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, region: 'eu-west-1' });
  cloudformationRegistryManager.cloudformationPrivateTypesInfo = {
    availableCloudformationPrivateTypesFiles: { atlasMongo: {}, upstashRedis: {}, ecsBlueGreen: {} },
    registeredCloudformationPrivateTypes: {}
  };
});
afterEach(() => mock.restore());

test('does not discover private types or packages when the stack requires none', async () => {
  const packages = spyOn(awsSdkManager.s3, 'listObjects').mockRejectedValue(new Error('Unexpected package discovery'));
  const types = spyOn(awsSdkManager.cloudFormationRegistry, 'listTypesWithVersions').mockRejectedValue(
    new Error('Unexpected registry discovery')
  );
  await cloudformationRegistryManager.loadPrivateTypesAndPackages([]);
  expect(packages).not.toHaveBeenCalled();
  expect(types).not.toHaveBeenCalled();
});

test.each(Object.keys(SUPPORTED_CF_INFRASTRUCTURE_MODULES) as StpCfInfrastructureModuleType[])(
  'still discovers packages and computes compatible registered versions for %s',
  async (moduleType) => {
    const {
      privateTypesSpecs,
      privateTypesMajorVersionUsed,
      privateTypesMinimalRequiredSubversion: version
    } = SUPPORTED_CF_INFRASTRUCTURE_MODULES[moduleType];
    spyOn(awsSdkManager.s3, 'listObjects').mockResolvedValue(
      Object.values(privateTypesSpecs).flatMap(({ packagePrefix }) => [
        {
          Key: `${moduleType}/${privateTypesMajorVersionUsed}/${version}/${cfRegistryNames.buildZipPackageNameFromPackagePrefix({ packagePrefix })}`
        },
        {
          Key: `${moduleType}/${privateTypesMajorVersionUsed}/${version}/${cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({ packagePrefix })}`
        }
      ])
    );
    spyOn(awsSdkManager.cloudFormationRegistry, 'listTypesWithVersions').mockResolvedValue(
      Object.fromEntries(
        Object.keys(privateTypesSpecs).map((type) => [
          type,
          [{ Arn: `arn:${type}`, IsDefaultVersion: true, Description: version }]
        ])
      )
    );
    await cloudformationRegistryManager.loadPrivateTypesAndPackages([moduleType]);
    expect(
      cloudformationRegistryManager.areMinimalRequirementsForModulePrivateTypesMet({
        infrastructureModuleType: moduleType
      })
    ).toBe(true);
    const status = cloudformationRegistryManager.stacktapeInfrastructureModulesStatus[moduleType];
    expect(status.newestCompatibleCloudformationPrivateTypeVersion).toBe(version);
    for (const type of Object.keys(privateTypesSpecs)) {
      expect(status.currentlyUsedPrivateCloudformationTypes[type]).toEqual({ version });
      expect(status.newestPrivateTypesSpecs[type]).toEqual({ hasRoleFileAvailable: true });
    }
  }
);

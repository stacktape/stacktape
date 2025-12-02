import { describe, expect, test } from 'bun:test';
import { cfRegistryNames } from './cf-registry-types';

describe('cf-registry-types', () => {
  describe('buildRoleNameFromPackagePrefix', () => {
    test('should build role name with package prefix and region', () => {
      const result = cfRegistryNames.buildRoleNameFromPackagePrefix({
        packagePrefix: 'my-package',
        region: 'us-east-1'
      });
      expect(result).toBe('stp-my-package-us-east-1');
    });

    test('should include stp prefix', () => {
      const result = cfRegistryNames.buildRoleNameFromPackagePrefix({
        packagePrefix: 'test',
        region: 'eu-west-1'
      });
      expect(result).toStartWith('stp-');
    });

    test('should handle different regions', () => {
      const regions = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'];
      regions.forEach((region) => {
        const result = cfRegistryNames.buildRoleNameFromPackagePrefix({
          packagePrefix: 'pkg',
          region
        });
        expect(result).toContain(region);
        expect(result).toBe(`stp-pkg-${region}`);
      });
    });

    test('should handle different package prefixes', () => {
      const prefixes = ['resource-provider', 'custom-type', 'module'];
      prefixes.forEach((prefix) => {
        const result = cfRegistryNames.buildRoleNameFromPackagePrefix({
          packagePrefix: prefix,
          region: 'us-east-1'
        });
        expect(result).toContain(prefix);
        expect(result).toBe(`stp-${prefix}-us-east-1`);
      });
    });

    test('should format consistently', () => {
      const result1 = cfRegistryNames.buildRoleNameFromPackagePrefix({
        packagePrefix: 'abc',
        region: 'xyz'
      });
      const result2 = cfRegistryNames.buildRoleNameFromPackagePrefix({
        packagePrefix: 'abc',
        region: 'xyz'
      });
      expect(result1).toBe(result2);
      expect(result1).toBe('stp-abc-xyz');
    });
  });

  describe('buildZipPackageNameFromPackagePrefix', () => {
    test('should build zip package name from prefix', () => {
      const result = cfRegistryNames.buildZipPackageNameFromPackagePrefix({
        packagePrefix: 'my-package'
      });
      expect(result).toBe('my-package.zip');
    });

    test('should add .zip extension', () => {
      const result = cfRegistryNames.buildZipPackageNameFromPackagePrefix({
        packagePrefix: 'resource-type'
      });
      expect(result).toEndWith('.zip');
    });

    test('should handle different prefixes', () => {
      const prefixes = ['handler', 'schema', 'provider', 'custom-resource'];
      prefixes.forEach((prefix) => {
        const result = cfRegistryNames.buildZipPackageNameFromPackagePrefix({
          packagePrefix: prefix
        });
        expect(result).toBe(`${prefix}.zip`);
      });
    });

    test('should be consistent', () => {
      const result1 = cfRegistryNames.buildZipPackageNameFromPackagePrefix({
        packagePrefix: 'test'
      });
      const result2 = cfRegistryNames.buildZipPackageNameFromPackagePrefix({
        packagePrefix: 'test'
      });
      expect(result1).toBe(result2);
      expect(result1).toBe('test.zip');
    });
  });

  describe('buildRoleDefinitionFileNameFromPackagePrefix', () => {
    test('should build role definition file name from prefix', () => {
      const result = cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({
        packagePrefix: 'my-package'
      });
      expect(result).toBe('my-package-role.yml');
    });

    test('should add -role.yml suffix', () => {
      const result = cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({
        packagePrefix: 'custom-type'
      });
      expect(result).toEndWith('-role.yml');
    });

    test('should handle different prefixes', () => {
      const prefixes = ['provider-a', 'provider-b', 'module-x'];
      prefixes.forEach((prefix) => {
        const result = cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({
          packagePrefix: prefix
        });
        expect(result).toBe(`${prefix}-role.yml`);
      });
    });

    test('should use yml extension', () => {
      const result = cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({
        packagePrefix: 'test'
      });
      expect(result).toContain('.yml');
      expect(result).not.toContain('.yaml');
    });

    test('should be consistent', () => {
      const result1 = cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({
        packagePrefix: 'pkg'
      });
      const result2 = cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({
        packagePrefix: 'pkg'
      });
      expect(result1).toBe(result2);
      expect(result1).toBe('pkg-role.yml');
    });
  });

  describe('buildLogGroupNameFromPackagePrefix', () => {
    test('should build log group name from prefix', () => {
      const result = cfRegistryNames.buildLogGroupNameFromPackagePrefix({
        packagePrefix: 'my-package'
      });
      expect(result).toBe('/stp/cloudformation/my-package');
    });

    test('should start with /stp/cloudformation/', () => {
      const result = cfRegistryNames.buildLogGroupNameFromPackagePrefix({
        packagePrefix: 'test'
      });
      expect(result).toStartWith('/stp/cloudformation/');
    });

    test('should handle different prefixes', () => {
      const prefixes = ['type-a', 'type-b', 'module-c'];
      prefixes.forEach((prefix) => {
        const result = cfRegistryNames.buildLogGroupNameFromPackagePrefix({
          packagePrefix: prefix
        });
        expect(result).toBe(`/stp/cloudformation/${prefix}`);
      });
    });

    test('should follow CloudWatch log group naming convention', () => {
      const result = cfRegistryNames.buildLogGroupNameFromPackagePrefix({
        packagePrefix: 'resource-handler'
      });
      expect(result).toMatch(/^\/[a-z0-9-/]+$/);
    });

    test('should be consistent', () => {
      const result1 = cfRegistryNames.buildLogGroupNameFromPackagePrefix({
        packagePrefix: 'handler'
      });
      const result2 = cfRegistryNames.buildLogGroupNameFromPackagePrefix({
        packagePrefix: 'handler'
      });
      expect(result1).toBe(result2);
      expect(result1).toBe('/stp/cloudformation/handler');
    });
  });

  describe('integration - all methods together', () => {
    test('should generate consistent names for same package prefix', () => {
      const packagePrefix = 'my-custom-resource';
      const region = 'us-east-1';

      const roleName = cfRegistryNames.buildRoleNameFromPackagePrefix({ packagePrefix, region });
      const zipName = cfRegistryNames.buildZipPackageNameFromPackagePrefix({ packagePrefix });
      const roleDefName = cfRegistryNames.buildRoleDefinitionFileNameFromPackagePrefix({ packagePrefix });
      const logGroupName = cfRegistryNames.buildLogGroupNameFromPackagePrefix({ packagePrefix });

      expect(roleName).toContain(packagePrefix);
      expect(zipName).toContain(packagePrefix);
      expect(roleDefName).toContain(packagePrefix);
      expect(logGroupName).toContain(packagePrefix);
    });

    test('should generate unique names for different package prefixes', () => {
      const prefix1 = 'package-a';
      const prefix2 = 'package-b';
      const region = 'us-east-1';

      const role1 = cfRegistryNames.buildRoleNameFromPackagePrefix({ packagePrefix: prefix1, region });
      const role2 = cfRegistryNames.buildRoleNameFromPackagePrefix({ packagePrefix: prefix2, region });

      const zip1 = cfRegistryNames.buildZipPackageNameFromPackagePrefix({ packagePrefix: prefix1 });
      const zip2 = cfRegistryNames.buildZipPackageNameFromPackagePrefix({ packagePrefix: prefix2 });

      expect(role1).not.toBe(role2);
      expect(zip1).not.toBe(zip2);
    });
  });
});

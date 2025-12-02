import { describe, expect, test } from 'bun:test';
import { getPrefixForUserAppResourceDefaultDomainName } from './domain-names';

describe('domain-names', () => {
  describe('getPrefixForUserAppResourceDefaultDomainName', () => {
    test('should generate domain prefix for non-CDN resource', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'myApi',
        stackName: 'prod-stack'
      });
      expect(prefix).toBe('myapi-prod-stack');
    });

    test('should generate domain prefix for CDN resource', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'myWebsite',
        stackName: 'prod-stack',
        cdn: true
      });
      expect(prefix).toBe('mywebsite-cdn-prod-stack');
    });

    test('should convert resource name to lowercase', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'MyAPI',
        stackName: 'stack'
      });
      expect(prefix).toBe('myapi-stack');
      expect(prefix).not.toContain('MyAPI');
    });

    test('should include -cdn suffix when cdn is true', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'resource',
        stackName: 'stack',
        cdn: true
      });
      expect(prefix).toContain('-cdn-');
    });

    test('should not include -cdn suffix when cdn is false', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'resource',
        stackName: 'stack',
        cdn: false
      });
      expect(prefix).not.toContain('-cdn');
    });

    test('should not include -cdn suffix when cdn is undefined', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'resource',
        stackName: 'stack'
      });
      expect(prefix).not.toContain('-cdn');
    });

    test('should join with hyphens', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'api',
        stackName: 'production'
      });
      expect(prefix).toMatch(/^[a-z]+-[a-z]+$/);
    });

    test('should handle resource names with mixed case', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'MyApiGateway',
        stackName: 'dev'
      });
      expect(prefix).toBe('myapigateway-dev');
    });

    test('should handle stack names with hyphens', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'api',
        stackName: 'prod-us-east-1'
      });
      expect(prefix).toBe('api-prod-us-east-1');
    });

    test('should handle resource names with hyphens', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'my-api',
        stackName: 'stack'
      });
      expect(prefix).toBe('my-api-stack');
    });

    test('should be consistent for same inputs', () => {
      const prefix1 = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'api',
        stackName: 'prod'
      });
      const prefix2 = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'api',
        stackName: 'prod'
      });
      expect(prefix1).toBe(prefix2);
    });

    test('should differ for CDN vs non-CDN', () => {
      const nonCdn = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'api',
        stackName: 'prod'
      });
      const cdn = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'api',
        stackName: 'prod',
        cdn: true
      });
      expect(nonCdn).not.toBe(cdn);
      expect(cdn).toBe(`${nonCdn.split('-')[0]}-cdn-${nonCdn.split('-')[1]}`);
    });

    test('should handle single character names', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'a',
        stackName: 'b'
      });
      expect(prefix).toBe('a-b');
    });

    test('should handle long names', () => {
      const longResource = 'very-long-resource-name-with-many-parts';
      const longStack = 'very-long-stack-name-with-many-parts';
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: longResource,
        stackName: longStack
      });
      expect(prefix).toContain(longResource.toLowerCase());
      expect(prefix).toContain(longStack);
    });

    test('should handle numbers in names', () => {
      const prefix = getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'api123',
        stackName: 'prod456'
      });
      expect(prefix).toBe('api123-prod456');
    });
  });
});

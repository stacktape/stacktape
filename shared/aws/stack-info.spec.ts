import type { Stack } from '@aws-sdk/client-cloudformation';
import { describe, expect, mock, test } from 'bun:test';
import {
  getResourcesWithSpecificLinks,
  getStackCfTemplateS3ConsoleLink,
  getStackStpTemplateS3ConsoleLink
} from './stack-info';

// Mock dependencies
mock.module('@shared/aws/sdk-manager', () => ({}));
mock.module('@shared/naming/aws-resource-names', () => ({
  awsResourceNames: new Proxy(
    {
      deploymentBucket: mock((hash) => `stp-deployment-bucket-${hash}`)
    },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return mock((...args) => `mock-${String(prop)}-${args.join('-')}`);
      }
    }
  )
}));
mock.module('@shared/naming/console-links', () => ({
  consoleLinks: new Proxy(
    {
      s3Object: mock(
        ({ bucketName, objectKey }) => `https://console.aws.amazon.com/s3/object/${bucketName}/${objectKey}`
      )
    },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return mock(() => `https://console.aws.amazon.com/mock-${String(prop)}`);
      }
    }
  )
}));
mock.module('@shared/naming/stack-output-names', () => ({
  outputNames: new Proxy(
    {
      stackInfoMap: () => 'StackInfoMap',
      deploymentVersion: () => 'DeploymentVersion'
    },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return mock(() => `Mock${String(prop)}`);
      }
    }
  )
}));
mock.module('@shared/naming/utils', () => ({
  getCfTemplateS3Key: mock((version) => `cf-templates/${version}.json`),
  getStpTemplateS3Key: mock((version) => `stp-templates/${version}.json`),
  getStacktapeStackInfoFromTemplateDescription: mock(() => ({ globallyUniqueStackHash: 'abc123hash' }))
}));

describe('stack-info', () => {
  const createMockStack = (outputs: any[] = []): Stack => ({
    StackName: 'test-stack',
    StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/abc123',
    StackStatus: 'CREATE_COMPLETE',
    CreationTime: new Date('2024-01-01T00:00:00Z'),
    LastUpdatedTime: new Date('2024-01-02T00:00:00Z'),
    Description: 'Stacktape stack description',
    Outputs: outputs
  });

  describe('getResourcesWithSpecificLinks', () => {
    test('should return resources with logs links', () => {
      const stack = createMockStack([
        {
          OutputKey: 'StackInfoMap',
          OutputValue: JSON.stringify({
            resources: {
              myFunction: {
                links: {
                  logs: 'https://console.aws.amazon.com/cloudwatch/logs',
                  'logs-errors': 'https://console.aws.amazon.com/cloudwatch/logs?filter=ERROR'
                }
              },
              myService: {
                links: {
                  metrics: 'https://console.aws.amazon.com/cloudwatch/metrics',
                  logs: 'https://console.aws.amazon.com/cloudwatch/logs'
                }
              }
            }
          })
        }
      ]);

      const result = getResourcesWithSpecificLinks({ linkNamePrefix: 'logs', stackDetails: stack });

      expect(result).toBeDefined();
      expect(result.myFunction).toBeDefined();
      expect(result.myFunction.logs).toBeDefined();
      expect(result.myFunction['logs-errors']).toBeDefined();
      expect(result.myService).toBeDefined();
      expect(result.myService.logs).toBeDefined();
    });

    test('should return resources with metrics links', () => {
      const stack = createMockStack([
        {
          OutputKey: 'StackInfoMap',
          OutputValue: JSON.stringify({
            resources: {
              myFunction: {
                links: {
                  metrics: 'https://console.aws.amazon.com/cloudwatch/metrics',
                  'metrics-errors': 'https://console.aws.amazon.com/cloudwatch/metrics?stat=errors'
                }
              }
            }
          })
        }
      ]);

      const result = getResourcesWithSpecificLinks({ linkNamePrefix: 'metrics', stackDetails: stack });

      expect(result.myFunction).toBeDefined();
      expect(result.myFunction.metrics).toBeDefined();
      expect(result.myFunction['metrics-errors']).toBeDefined();
    });

    test('should return empty object when no matching resources', () => {
      const stack = createMockStack([
        {
          OutputKey: 'StackInfoMap',
          OutputValue: JSON.stringify({
            resources: {
              myResource: {
                links: {
                  console: 'https://console.aws.amazon.com/resource'
                }
              }
            }
          })
        }
      ]);

      const result = getResourcesWithSpecificLinks({ linkNamePrefix: 'logs', stackDetails: stack });

      expect(Object.keys(result)).toHaveLength(0);
    });

    test('should handle empty stack info map', () => {
      const stack = createMockStack([{ OutputKey: 'StackInfoMap', OutputValue: '{}' }]);

      const result = getResourcesWithSpecificLinks({ linkNamePrefix: 'logs', stackDetails: stack });

      expect(result).toEqual({});
    });
  });

  describe('getStackCfTemplateS3ConsoleLink', () => {
    test('should generate CloudFormation template S3 console link', () => {
      const stack = createMockStack([{ OutputKey: 'DeploymentVersion', OutputValue: 'v1.0.0' }]);

      const link = getStackCfTemplateS3ConsoleLink({ stackDetails: stack });

      expect(link).toBeDefined();
      expect(link).toContain('stp-deployment-bucket');
      expect(link).toContain('cf-templates/v1.0.0.json');
    });

    test('should work with different versions', () => {
      const stack = createMockStack([{ OutputKey: 'DeploymentVersion', OutputValue: 'v2.5.10' }]);

      const link = getStackCfTemplateS3ConsoleLink({ stackDetails: stack });

      expect(link).toContain('cf-templates/v2.5.10.json');
    });
  });

  describe('getStackStpTemplateS3ConsoleLink', () => {
    test('should generate Stacktape template S3 console link', () => {
      const stack = createMockStack([{ OutputKey: 'DeploymentVersion', OutputValue: 'v1.0.0' }]);

      const link = getStackStpTemplateS3ConsoleLink({ stackDetails: stack });

      expect(link).toBeDefined();
      expect(link).toContain('stp-deployment-bucket');
      expect(link).toContain('stp-templates/v1.0.0.json');
    });

    test('should work with different deployment versions', () => {
      const stack = createMockStack([{ OutputKey: 'DeploymentVersion', OutputValue: 'v3.0.0-beta.1' }]);

      const link = getStackStpTemplateS3ConsoleLink({ stackDetails: stack });

      expect(link).toContain('stp-templates/v3.0.0-beta.1.json');
    });
  });
});

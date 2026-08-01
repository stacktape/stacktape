import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import type { AwsS3 } from '../../src/aws/s3';
import type { StacktapeArgs } from '../../src/config/cli/types';
import type { EnrichedStackResourceInfo } from '../../src/domain/cloudformation-stack-manager/types';
import {
  commandBucketSync,
  getDirectBucketSyncUploadConfiguration,
  resolveBucketSyncTarget
} from '../../src/commands/bucket-sync';
import { getLogGroupInfoForStacktapeResource } from '../../src/commands/_utils/logs';

describe('diagnostic command invocation inputs', () => {
  test('keeps an explicit bucket ID on the credentials-only sync path', () => {
    expect(resolveBucketSyncTarget({ bucketId: 'customer-assets', resourceName: undefined })).toEqual({
      kind: 'bucket-id',
      initialization: 'credentials-only',
      bucketName: 'customer-assets'
    });
    expect(resolveBucketSyncTarget({ bucketId: undefined, resourceName: 'website' })).toEqual({
      kind: 'stack-resource',
      initialization: 'deployed-stack',
      resourceName: 'website'
    });

    const args = { headersPreset: 'single-page-app' } as const;
    const directoryPath = 'C:\\project\\dist';

    expect(getDirectBucketSyncUploadConfiguration({ args, directoryPath, region: 'eu-north-1' })).toEqual({
      directoryPath,
      headersPreset: 'single-page-app',
      excludeFilesPatterns: undefined,
      fileOptions: undefined,
      disableS3TransferAcceleration: true
    });
    expect(getDirectBucketSyncUploadConfiguration({ args, directoryPath, region: 'eu-west-1' })).toEqual({
      directoryPath,
      headersPreset: 'single-page-app',
      excludeFilesPatterns: undefined,
      fileOptions: undefined,
      disableS3TransferAcceleration: false
    });
  });

  test.serial('executes direct bucket sync without initializing stack or config services', async () => {
    const sourcePath = mkdtempSync(join(tmpdir(), 'stacktape-bucket-sync-'));
    const originalArgs = globalStateManager.rawArgs;
    let credentialsInitializationCount = 0;
    let deployedStackInitializationCount = 0;
    let syncRequest: Parameters<AwsS3['syncDirectory']>[0] | undefined;

    const commandArgs = {
      bucketId: 'customer-assets',
      headersPreset: 'single-page-app',
      invalidateCdnCache: false,
      region: 'eu-north-1',
      sourcePath
    } satisfies StacktapeArgs;
    globalStateManager.rawArgs = commandArgs;

    try {
      await commandBucketSync({
        initializeCredentials: async () => {
          credentialsInitializationCount += 1;
          return Object.freeze({
            args: Object.freeze({ ...commandArgs }),
            region: 'eu-north-1' as const,
            workingDir: process.cwd()
          });
        },
        initializeDeployedStack: async () => {
          deployedStackInitializationCount += 1;
          throw new Error('Direct bucket sync must not initialize deployed-stack or config services.');
        },
        getExecutionServices: () => ({
          cloudFront: {
            findDistributionsForBucket: async () => {
              throw new Error('Direct bucket sync must not inspect CloudFront when cache invalidation is disabled.');
            },
            invalidateCache: async () => {
              throw new Error('Direct bucket sync must not invalidate CloudFront when cache invalidation is disabled.');
            }
          },
          event: {
            finishEvent: async () => undefined,
            startEvent: async () => undefined,
            updateEvent: async () => undefined
          },
          notification: {
            sendDeploymentNotification: async () => undefined
          },
          s3: {
            syncDirectory: async (request) => {
              syncRequest = request;
              return {
                activeTransfers: 0,
                deleteAmount: 0,
                deleteTotal: 0,
                filesFound: 1,
                objectsFound: 1,
                progressAmount: 1,
                progressMd5Amount: 1,
                progressMd5Total: 1,
                progressPercent: 100,
                progressTotal: 1
              };
            }
          }
        })
      });

      expect(credentialsInitializationCount).toBe(1);
      expect(deployedStackInitializationCount).toBe(0);
      expect(syncRequest).toBeDefined();
      const { onProgress, ...requestWithoutCallback } = syncRequest!;
      expect(onProgress).toBeFunction();
      expect(requestWithoutCallback).toEqual({
        bucketName: 'customer-assets',
        deleteRemoved: true,
        uploadConfiguration: {
          directoryPath: sourcePath,
          headersPreset: 'single-page-app',
          excludeFilesPatterns: undefined,
          fileOptions: undefined,
          disableS3TransferAcceleration: true
        }
      });
    } finally {
      globalStateManager.rawArgs = originalArgs;
      rmSync(sourcePath, { force: true, recursive: true });
    }
  });

  test('resolves a log group only from the supplied stack identity and resources', () => {
    const lambdaLogGroup = {
      LogicalResourceId: 'LambdaFunctionApi',
      PhysicalResourceId: '/aws/lambda/orders-dev-api',
      ResourceType: 'AWS::Logs::LogGroup',
      LastUpdatedTimestamp: new Date('2026-01-01T00:00:00.000Z'),
      ResourceStatus: 'CREATE_COMPLETE'
    } satisfies EnrichedStackResourceInfo;

    expect(
      getLogGroupInfoForStacktapeResource({
        resourceName: 'api',
        stackName: 'orders-dev',
        stackResources: [lambdaLogGroup]
      })
    ).toBe(lambdaLogGroup);

    expect(() =>
      getLogGroupInfoForStacktapeResource({
        resourceName: 'api',
        stackName: 'another-stack',
        stackResources: [lambdaLogGroup]
      })
    ).toThrow('No log group found for resource "api"');
  });
});

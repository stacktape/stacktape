import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { EnrichedStackResourceInfo, StackDetails } from '../../src/domain/cloudformation-stack-manager/types';
import { stackManager } from '../../src/domain/cloudformation-stack-manager';
import { applicationManager } from '../../src/app/application-manager';
import { globalStateManager } from '../../src/app/global-state-manager';
import { operationReporter } from '../../src/app/operation-manager';
import { configManager } from '../../src/domain/config-manager';
import { deployedStackOverviewManager } from '../../src/domain/deployed-stack-overview-manager';
import { awsSdkManager } from '../../src/utils/aws-sdk-manager';
import { withCredentiallessSynthesisBoundary } from './synthesis-fixture';

/**
 * `delete` starts slow AWS-side work before CloudFormation's DeleteStack: it scales ECS services to 0 and disables
 * CloudFront distributions while the buckets are being emptied, and it does not hold DeleteStack until the tasks have
 * drained. A delete that never reaches CloudFormation enables the distributions again.
 */

const stackName = 'delete-test';
const serviceArn = 'arn:aws:ecs:eu-west-1:123456789012:service/delete-test-cluster/web';
const distributionId = 'E2DISTRIBUTION';

const resource = (ResourceType: string, PhysicalResourceId: string) =>
  ({
    ResourceType,
    PhysicalResourceId,
    LogicalResourceId: ResourceType.replaceAll(':', '')
  }) as EnrichedStackResourceInfo;

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const settle = async () => {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
};

const withDeleteFixture = async (
  resources: EnrichedStackResourceInfo[],
  run: (fixture: { calls: string[]; runCleanUpHooks: () => Promise<void> }) => Promise<void>
) => {
  await withCredentiallessSynthesisBoundary(async () => {
    operationReporter.setSilentMode(true);
    globalStateManager.rawCommands = ['delete'];
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    const calls: string[] = [];
    const hooks: ((args: { success: boolean }) => Promise<unknown>)[] = [];
    const spies = [
      spyOn(applicationManager, 'registerCleanUpHook').mockImplementation((hook) => {
        hooks.push(hook as (typeof hooks)[number]);
      }),
      spyOn(awsSdkManager.ecs, 'startRollingUpdate').mockImplementation(async ({ service, desiredCount }) => {
        calls.push(`ecs:scale ${service} ${desiredCount}`);
        return { deploymentId: undefined };
      }),
      spyOn(awsSdkManager.ecs, 'getService').mockImplementation(async () => {
        calls.push('ecs:describe');
        return { runningCount: 1 } as Awaited<ReturnType<typeof awsSdkManager.ecs.getService>>;
      }),
      spyOn(awsSdkManager.cloudFront, 'setDistributionEnabled').mockImplementation(
        async ({ distributionId: id, enabled }) => {
          calls.push(`cloudfront:${enabled ? 'enable' : 'disable'} ${id}`);
          return true;
        }
      ),
      spyOn(awsSdkManager.cloudFormation, 'delete').mockImplementation(async (name) => {
        calls.push(`cloudformation:delete ${name}`);
        return {} as never;
      }),
      spyOn(stackManager, 'monitorStack').mockImplementation(async () => {
        calls.push('cloudformation:monitor');
        return {};
      })
    ];
    // A delete without a CloudFormation role in the config or the stack metadata.
    Object.defineProperty(configManager, 'deploymentConfig', { configurable: true, get: () => undefined });
    spies.push(spyOn(deployedStackOverviewManager, 'getStackMetadata').mockReturnValue(undefined));
    stackManager.existingStackResources = resources;
    stackManager.existingStackDetails = {
      StackName: stackName,
      StackId: stackName,
      StackStatus: 'UPDATE_COMPLETE',
      CreationTime: new Date('2026-10-01'),
      stackOutput: {}
    } as StackDetails;
    try {
      await run({
        calls,
        runCleanUpHooks: async () => {
          for (const hook of hooks) await hook({ success: false });
        }
      });
    } finally {
      for (const spy of spies) spy.mockRestore();
      delete (configManager as { deploymentConfig?: unknown }).deploymentConfig;
      stackManager.existingStackResources = [];
    }
  });
};

describe('stack delete', () => {
  afterEach(() => {
    stackManager.existingStackResources = [];
  });

  test('scales ECS down and disables CloudFront while the buckets are emptied, then deletes without a drain wait', async () => {
    await withDeleteFixture(
      [resource('AWS::ECS::Service', serviceArn), resource('AWS::CloudFront::Distribution', distributionId)],
      async ({ calls, runCleanUpHooks }) => {
        const emptying = deferred();
        const deleting = stackManager.deleteStack({ beforeDelete: () => emptying.promise });
        await settle();
        // Both started while emptying is still running, and CloudFormation has not been asked yet.
        expect(calls).toEqual(
          expect.arrayContaining([`ecs:scale ${serviceArn} 0`, `cloudfront:disable ${distributionId}`])
        );
        expect(calls.some((call) => call.startsWith('cloudformation:'))).toBe(false);

        emptying.resolve();
        await deleting;
        expect(calls.slice(-2)).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
        // DeleteStack does not wait for the tasks to drain: CloudFormation's service delete does that.
        expect(calls).not.toContain('ecs:describe');

        // The delete reached CloudFormation, so nothing is enabled again.
        await runCleanUpHooks();
        expect(calls.filter((call) => call.startsWith('cloudfront:enable'))).toEqual([]);
      }
    );
  });

  test('enables the distribution again when the delete never reaches CloudFormation', async () => {
    await withDeleteFixture(
      [resource('AWS::CloudFront::Distribution', distributionId)],
      async ({ calls, runCleanUpHooks }) => {
        const emptying = deferred();
        const deleting = stackManager.deleteStack({ beforeDelete: () => emptying.promise });
        await settle();
        emptying.reject(new Error('AccessDenied while emptying the bucket'));
        await expect(deleting).rejects.toThrow('AccessDenied while emptying the bucket');
        expect(calls.some((call) => call.startsWith('cloudformation:'))).toBe(false);

        await runCleanUpHooks();
        expect(calls).toContain(`cloudfront:enable ${distributionId}`);
      }
    );
  });

  test('a stack without services or distributions goes straight to CloudFormation', async () => {
    await withDeleteFixture([resource('AWS::S3::Bucket', 'delete-test-bucket')], async ({ calls }) => {
      let emptied = false;
      await stackManager.deleteStack({
        beforeDelete: async () => {
          emptied = true;
        }
      });
      expect(emptied).toBe(true);
      expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
    });
  });

  test('a failed disable leaves the distribution to CloudFormation and still deletes the stack', async () => {
    await withDeleteFixture(
      [resource('AWS::CloudFront::Distribution', distributionId)],
      async ({ calls, runCleanUpHooks }) => {
        (awsSdkManager.cloudFront.setDistributionEnabled as unknown as ReturnType<typeof spyOn>).mockImplementation(
          async () => {
            throw new Error('AccessDenied: cloudfront:UpdateDistribution');
          }
        );
        await stackManager.deleteStack();
        expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
        await runCleanUpHooks();
        expect(calls).toHaveLength(2);
      }
    );
  });
});

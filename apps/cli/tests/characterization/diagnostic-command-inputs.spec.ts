import { describe, expect, test } from 'bun:test';
import type { EnrichedStackResourceInfo } from '../../src/domain/cloudformation-stack-manager/types';
import { resolveReferenceableParam } from '../../src/commands/param-get';
import { getLogGroupInfoForStacktapeResource } from '../../src/commands/_utils/logs';

describe('diagnostic command invocation inputs', () => {
  test('distinguishes a missing deployed resource from an unsupported parameter', () => {
    expect(() =>
      resolveReferenceableParam({
        resource: undefined,
        resourceName: 'api',
        paramName: 'url',
        stackName: 'orders-dev'
      })
    ).toThrow(
      expect.objectContaining({
        category: 'NON_EXISTING_RESOURCE',
        code: 'DEPLOYED_RESOURCE_NOT_FOUND',
        message: expect.stringContaining('`orders-dev`')
      })
    );

    const resource = {
      resourceType: 'function' as const,
      referencableParams: {
        arn: { value: 'arn:aws:lambda:eu-west-1:123:function:orders', showDuringPrint: true }
      }
    };
    expect(() =>
      resolveReferenceableParam({ resource, resourceName: 'api', paramName: 'url', stackName: 'orders-dev' })
    ).toThrow(
      expect.objectContaining({
        category: 'PARAMETER',
        code: 'RESOURCE_PARAMETER_NOT_REFERENCEABLE',
        hints: ['Referenceable parameters: `arn`.']
      })
    );
    expect(
      resolveReferenceableParam({ resource, resourceName: 'api', paramName: 'arn', stackName: 'orders-dev' }).value
    ).toBe('arn:aws:lambda:eu-west-1:123:function:orders');
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
    ).toThrow(
      expect.objectContaining({
        category: 'CONFIG',
        code: 'LOG_GROUP_NOT_FOUND',
        message: 'No log group was found for resource `api`.'
      })
    );
  });
});

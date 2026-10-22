import type { StpServiceCustomResourceEdgeFunctionProps } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import { IAM } from '@aws-sdk/client-iam';
import { InvalidParameterValueException, Lambda } from '@aws-sdk/client-lambda';
import { REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION } from 'src/config/constants';
import { edgeFunctions } from './edge-functions';

const edgeFunction = {
  name: 'cdnOriginRequestLambda',
  resourceName: 'shop-production-stpOReq-eu-west-1',
  lambdaRoleResourceName: 'shop-production-cdnOriginRequestLambda-eu-west-1',
  lambdaLogGroupName: '/aws/lambda/us-east-1.shop-production-stpOReq-eu-west-1',
  globallyUniqueStackHash: 'abc123'
} as StpServiceCustomResourceEdgeFunctionProps;

/** Records what the resolver deleted; every call resolves only after a delay, like a real request. */
const stubAws = ({ deleteFunction }: { deleteFunction: () => Promise<unknown> }) => {
  const deleted: { logGroups: string[]; rolePolicies: string[]; roles: string[]; functions: string[] } = {
    logGroups: [],
    rolePolicies: [],
    roles: [],
    functions: []
  };
  const later = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 20));
  spyOn(CloudWatchLogs.prototype, 'deleteLogGroup').mockImplementation(async function (
    this: CloudWatchLogs,
    { logGroupName }
  ) {
    await later(undefined);
    deleted.logGroups.push(`${await this.config.region()} ${logGroupName}`);
    return {} as never;
  });
  spyOn(IAM.prototype, 'listRolePolicies').mockImplementation(() => later({ PolicyNames: ['access'] }) as never);
  spyOn(IAM.prototype, 'deleteRolePolicy').mockImplementation(async ({ RoleName, PolicyName }) => {
    deleted.rolePolicies.push(`${RoleName}/${PolicyName}`);
    return later({}) as never;
  });
  spyOn(IAM.prototype, 'deleteRole').mockImplementation(async ({ RoleName }) => {
    deleted.roles.push(RoleName!);
    return later({}) as never;
  });
  spyOn(Lambda.prototype, 'deleteFunction').mockImplementation(async ({ FunctionName }) => {
    await deleteFunction();
    deleted.functions.push(FunctionName!);
    return {} as never;
  });
  return deleted;
};

describe('edge functions custom resource deletion', () => {
  afterEach(() => {
    for (const client of [CloudWatchLogs, IAM, Lambda]) {
      for (const method of Object.values(client.prototype)) {
        (method as { mockRestore?: () => void }).mockRestore?.();
      }
    }
  });

  test('removes the function, its role and its log group in every region before it responds', async () => {
    const deleted = stubAws({ deleteFunction: async () => undefined });

    await edgeFunctions([edgeFunction], undefined, 'Delete');

    expect(deleted.logGroups.toSorted()).toEqual(
      REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION.map((region) => `${region} ${edgeFunction.lambdaLogGroupName}`).toSorted()
    );
    expect(deleted.rolePolicies).toEqual([`${edgeFunction.lambdaRoleResourceName}/access`]);
    expect(deleted.roles).toEqual([edgeFunction.lambdaRoleResourceName]);
    expect(deleted.functions).toEqual([edgeFunction.resourceName]);
  });

  test('keeps a function that still has CloudFront replicas without failing the stack deletion', async () => {
    const deleted = stubAws({
      deleteFunction: async () => {
        throw new InvalidParameterValueException({
          message: `Lambda was unable to delete ${edgeFunction.resourceName}:1 because it is a replicated function.`,
          $metadata: {}
        });
      }
    });

    await edgeFunctions([edgeFunction], undefined, 'Delete');

    expect(deleted.roles).toEqual([edgeFunction.lambdaRoleResourceName]);
    expect(deleted.logGroups).toHaveLength(REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION.length);
    expect(deleted.functions).toEqual([]);
  });

  test('fails the deletion on any other Lambda error', async () => {
    stubAws({
      deleteFunction: async () => {
        throw new Error('AccessDeniedException');
      }
    });

    await expect(edgeFunctions([edgeFunction], undefined, 'Delete')).rejects.toThrow('AccessDeniedException');
  });
});

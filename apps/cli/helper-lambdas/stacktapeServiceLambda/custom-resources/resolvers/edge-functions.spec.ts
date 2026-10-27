import type { StpServiceCustomResourceEdgeFunctionProps } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import { IAM, NoSuchEntityException } from '@aws-sdk/client-iam';
import {
  InvalidParameterValueException,
  Lambda,
  ResourceNotFoundException as LambdaNotFoundException
} from '@aws-sdk/client-lambda';
import { S3 } from '@aws-sdk/client-s3';
import { REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION } from 'src/config/constants';
import { edgeFunctions } from './edge-functions';
import { ensureEdgeDeploymentBucket } from './edge-lambda-bucket';

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

const newEdgeFunction = {
  ...edgeFunction,
  artifactBucketName: 'shop-production-deployment-bucket',
  artifactS3Key: 'cdnOriginRequestLambda/abc.zip',
  handler: 'index.default',
  memory: 256,
  timeout: 10,
  runtime: 'nodejs22.x',
  logging: { retentionDays: 3 },
  preprocessedRolePolicies: [{ PolicyName: 'access', PolicyDocument: { Statement: [] } }]
} as unknown as StpServiceCustomResourceEdgeFunctionProps;

/**
 * Answers every request of a new edge function's creation. `createFunction` and `createBucket` can be given extra
 * behaviour; every request is recorded as `<service>:<command>`.
 */
const stubCreation = ({
  createFunction = async () => ({}),
  headBucket = async () => {
    throw Object.assign(new Error('NotFound'), { name: 'NotFound' });
  },
  createBucket = async () => ({})
}: {
  createFunction?: () => Promise<unknown>;
  headBucket?: () => Promise<unknown>;
  createBucket?: () => Promise<unknown>;
}) => {
  const requests: string[] = [];
  const record = (service: string, command: { constructor: { name: string } }) =>
    requests.push(`${service}:${command.constructor.name.replace(/Command$/, '')}`);
  const spies = [
    spyOn(CloudWatchLogs.prototype, 'send').mockImplementation((async (command: { constructor: { name: string } }) => {
      record('logs', command);
      return command.constructor.name === 'DescribeLogGroupsCommand' ? { logGroups: [] } : {};
    }) as never),
    spyOn(IAM.prototype, 'send').mockImplementation((async (command: { constructor: { name: string } }) => {
      record('iam', command);
      switch (command.constructor.name) {
        case 'GetRoleCommand':
          throw new NoSuchEntityException({ message: 'no role', $metadata: {} });
        case 'CreateRoleCommand':
          return { Role: { Arn: `arn:aws:iam::123456789012:role/${edgeFunction.lambdaRoleResourceName}` } };
        case 'ListRolePoliciesCommand':
          return { PolicyNames: [] };
        default:
          return {};
      }
    }) as never),
    spyOn(S3.prototype, 'send').mockImplementation((async (command: { constructor: { name: string } }) => {
      record('s3', command);
      switch (command.constructor.name) {
        case 'HeadBucketCommand':
          return headBucket();
        case 'CreateBucketCommand':
          return createBucket();
        default:
          return {};
      }
    }) as never),
    spyOn(Lambda.prototype, 'send').mockImplementation((async (command: { constructor: { name: string } }) => {
      record('lambda', command);
      switch (command.constructor.name) {
        case 'GetFunctionCommand':
          throw new LambdaNotFoundException({ message: 'no function', $metadata: {} });
        case 'CreateFunctionCommand':
          return createFunction();
        case 'GetFunctionConfigurationCommand':
          return { State: 'Active', LastUpdateStatus: 'Successful' };
        case 'PublishVersionCommand':
          return { FunctionArn: `arn:aws:lambda:us-east-1:123456789012:function:${edgeFunction.resourceName}:1` };
        default:
          return {};
      }
    }) as never)
  ];
  return { requests, restore: () => spies.forEach((spy) => spy.mockRestore()) };
};

describe('edge functions custom resource creation', () => {
  test('creates the bucket when missing and retries while the new role propagates, without a fixed wait', async () => {
    let attempts = 0;
    const { requests, restore } = stubCreation({
      createFunction: async () => {
        attempts++;
        if (attempts === 1) {
          throw new InvalidParameterValueException({
            message: 'The role defined for the function cannot be assumed by Lambda.',
            $metadata: {}
          });
        }
        return {};
      }
    });
    try {
      const startedAt = Date.now();
      const { data } = await edgeFunctions([newEdgeFunction], undefined, 'Create');
      // One retry interval, not the former fixed 10-second wait after creating the role.
      expect(Date.now() - startedAt).toBeLessThan(6000);
      expect(attempts).toBe(2);
      expect(data[edgeFunction.resourceName]).toEndWith(':1');
      const index = (request: string) => requests.indexOf(request);
      expect(index('s3:CreateBucket')).toBeGreaterThan(-1);
      expect(index('s3:CreateBucket')).toBeLessThan(index('s3:CopyObject'));
      expect(index('s3:CopyObject')).toBeLessThan(index('lambda:CreateFunction'));
      expect(index('iam:CreateRole')).toBeLessThan(index('lambda:CreateFunction'));
      expect(requests.filter((request) => request === 'logs:CreateLogGroup')).toHaveLength(
        REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION.length
      );
    } finally {
      restore();
    }
  });

  test('any other create error fails the resource', async () => {
    const { restore } = stubCreation({
      createFunction: async () => {
        throw new InvalidParameterValueException({ message: 'Unzipped size must be smaller than 1 MB', $metadata: {} });
      }
    });
    try {
      await expect(edgeFunctions([newEdgeFunction], undefined, 'Create')).rejects.toThrow('Unzipped size');
    } finally {
      restore();
    }
  });

  test('a bucket that another request is creating at the same time is retried, not failed', async () => {
    let heads = 0;
    const { requests, restore } = stubCreation({
      headBucket: async () => {
        heads++;
        if (heads === 1) throw Object.assign(new Error('NotFound'), { name: 'NotFound' });
        return {};
      },
      createBucket: async () => {
        throw Object.assign(new Error('A conflicting conditional operation is currently in progress'), {
          name: 'OperationAborted'
        });
      }
    });
    try {
      await ensureEdgeDeploymentBucket('shop-production-edge-bucket');
      expect(requests.filter((request) => request.startsWith('s3:'))).toEqual([
        's3:HeadBucket',
        's3:CreateBucket',
        's3:HeadBucket'
      ]);
    } finally {
      restore();
    }
  });
});

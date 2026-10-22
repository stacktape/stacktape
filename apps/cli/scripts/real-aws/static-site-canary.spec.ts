import { describe, expect, test } from 'bun:test';
import { cleanupEdgeFunctions, type EdgeFunction } from './static-site-canary';

const edgeFunction: EdgeFunction = {
  functionName: 'v4staticcanary-x-canary-stpOReq-eu-west-1',
  roleName: 'v4staticcanary-x-canary-cdnOriginRequestLambda-eu-west-1',
  logGroupName: '/aws/lambda/us-east-1.v4staticcanary-x-canary-stpOReq-eu-west-1'
};
const edgeBucket = 'stp-edge-deployment-bucket-abc123';
const regions = ['us-east-1', 'sa-east-1'];

type FunctionState = 'replicated' | 'deletable' | 'denied';

/** What exists in the fake account; every client reads and changes it like AWS would. */
const fakeAccount = ({
  buckets = [] as string[],
  logGroups = [] as string[],
  roles = [] as string[],
  functions = {} as Record<string, FunctionState>
}) => {
  const world = { buckets: new Set(buckets), logGroups: new Set(logGroups), roles: new Set(roles), functions };
  const missing = (name: string) => Object.assign(new Error(`${name}: not found`), { name });
  const client = (handlers: Record<string, (input: Record<string, string>) => unknown>, region = 'us-east-1') => ({
    config: { region: async () => region },
    send: async (command: { constructor: { name: string }; input: Record<string, string> }) => {
      const handler = handlers[command.constructor.name];
      if (!handler) throw new Error(`Unexpected ${command.constructor.name}`);
      return handler(command.input);
    }
  });
  const clients = {
    edgeS3: client({
      HeadBucketCommand: ({ Bucket }) => {
        if (!world.buckets.has(Bucket)) throw missing('NotFound');
        return {};
      },
      ListObjectVersionsCommand: () => ({ Versions: [], DeleteMarkers: [] }),
      DeleteBucketCommand: ({ Bucket }) => world.buckets.delete(Bucket)
    }),
    edgeLogs: regions.map((region) =>
      client(
        {
          DescribeLogGroupsCommand: ({ logGroupNamePrefix }) => ({
            logGroups: world.logGroups.has(`${region} ${logGroupNamePrefix}`)
              ? [{ logGroupName: logGroupNamePrefix }]
              : []
          }),
          DeleteLogGroupCommand: ({ logGroupName }) => world.logGroups.delete(`${region} ${logGroupName}`)
        },
        region
      )
    ),
    iam: client({
      GetRoleCommand: ({ RoleName }) => {
        if (!world.roles.has(RoleName)) throw missing('NoSuchEntityException');
        return {};
      },
      ListRolePoliciesCommand: () => ({ PolicyNames: ['access'] }),
      DeleteRolePolicyCommand: () => ({}),
      DeleteRoleCommand: ({ RoleName }) => world.roles.delete(RoleName)
    }),
    edgeLambda: client({
      GetFunctionCommand: ({ FunctionName }) => {
        if (!world.functions[FunctionName]) throw missing('ResourceNotFoundException');
        return {};
      },
      DeleteFunctionCommand: ({ FunctionName }) => {
        const state = world.functions[FunctionName];
        if (state === 'replicated') {
          throw new Error(`Lambda was unable to delete ${FunctionName}:1 because it is a replicated function.`);
        }
        if (state === 'denied') throw Object.assign(new Error('not authorized'), { name: 'AccessDeniedException' });
        delete world.functions[FunctionName];
        return {};
      }
    })
  };
  return { world, clients: clients as unknown as Parameters<typeof cleanupEdgeFunctions>[0] };
};

describe('static site canary edge cleanup', () => {
  test('a function AWS still replicates is deferred, not a leftover of the stack deletion', async () => {
    const { world, clients } = fakeAccount({ functions: { [edgeFunction.functionName]: 'replicated' } });

    const result = await cleanupEdgeFunctions(clients, [edgeFunction], [edgeBucket]);

    expect(result).toEqual({ leftByStack: [], pendingFunctions: [edgeFunction.functionName] });
    expect(world.functions[edgeFunction.functionName]).toBe('replicated');
  });

  test('a released function is deleted and verified gone', async () => {
    const { world, clients } = fakeAccount({ functions: { [edgeFunction.functionName]: 'deletable' } });

    const result = await cleanupEdgeFunctions(clients, [edgeFunction], [edgeBucket]);

    expect(result).toEqual({ leftByStack: [], pendingFunctions: [] });
    expect(world.functions).toEqual({});
  });

  test('a bucket, role or log group the stack deletion left is reported and removed', async () => {
    const { world, clients } = fakeAccount({
      buckets: [edgeBucket],
      logGroups: [`sa-east-1 ${edgeFunction.logGroupName}`],
      roles: [edgeFunction.roleName]
    });

    const result = await cleanupEdgeFunctions(clients, [edgeFunction], [edgeBucket]);

    expect(result.leftByStack).toEqual([
      `bucket ${edgeBucket}`,
      `log group ${edgeFunction.logGroupName} (sa-east-1)`,
      `role ${edgeFunction.roleName}`
    ]);
    expect(result.pendingFunctions).toEqual([]);
    expect([...world.buckets, ...world.logGroups, ...world.roles]).toEqual([]);
  });

  test('any other refusal to delete a function fails the cleanup', async () => {
    const { clients } = fakeAccount({ functions: { [edgeFunction.functionName]: 'denied' } });

    await expect(cleanupEdgeFunctions(clients, [edgeFunction], [])).rejects.toThrow('not authorized');
  });
});

import { describe, expect, test } from 'bun:test';
import type { IAMClient } from '@aws-sdk/client-iam';
import type { Policy } from '@cloudform/iam/role';
import {
  DeleteRolePolicyCommand,
  GetRoleCommand,
  ListRolePoliciesCommand,
  MalformedPolicyDocumentException,
  PutRolePolicyCommand,
  UpdateAssumeRolePolicyCommand
} from '@aws-sdk/client-iam';
import { AwsIam } from '../../src/aws/iam';

type Send = IAMClient['send'];

const iamWith = (send: Send) =>
  new AwsIam({
    createClient: () => ({ send }) as IAMClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

describe('AWS IAM role operations', () => {
  test('follows every inline-policy page using IAM markers', async () => {
    const requests: ListRolePoliciesCommand[] = [];
    const pages = [{ PolicyNames: ['First'], Marker: 'page-2' }, { PolicyNames: ['Second', 'Third'] }];
    const iam = iamWith((async (command: ListRolePoliciesCommand) => {
      requests.push(command);
      return pages.shift();
    }) as Send);

    await expect(iam.listInlineRolePolicies({ roleName: 'deployment-role' })).resolves.toEqual([
      'First',
      'Second',
      'Third'
    ]);
    expect(requests.map(({ input }) => input)).toEqual([
      { RoleName: 'deployment-role' },
      { RoleName: 'deployment-role', Marker: 'page-2' }
    ]);
  });

  test('updates desired inline policies and deletes only policies no longer desired', async () => {
    const putRequests: PutRolePolicyCommand[] = [];
    const deleteRequests: DeleteRolePolicyCommand[] = [];
    const iam = iamWith((async (command: ListRolePoliciesCommand | PutRolePolicyCommand | DeleteRolePolicyCommand) => {
      if (command instanceof ListRolePoliciesCommand) {
        return { PolicyNames: ['Keep', 'Remove'] };
      }
      if (command instanceof PutRolePolicyCommand) {
        putRequests.push(command);
      } else {
        deleteRequests.push(command);
      }
      return {};
    }) as Send);
    const desiredPolicies: Policy[] = [
      {
        PolicyName: 'Keep',
        PolicyDocument: { Statement: [{ Action: 's3:GetObject', Effect: 'Allow', Resource: '*' }] }
      },
      {
        PolicyName: 'Add',
        PolicyDocument: { Statement: [{ Action: 'logs:CreateLogGroup', Effect: 'Allow', Resource: '*' }] }
      }
    ];

    await iam.reconcileInlineRolePolicies({ roleName: 'deployment-role', desiredPolicies });

    expect(putRequests.map(({ input }) => input)).toEqual([
      {
        PolicyDocument: JSON.stringify(desiredPolicies[0].PolicyDocument),
        PolicyName: 'Keep',
        RoleName: 'deployment-role'
      },
      {
        PolicyDocument: JSON.stringify(desiredPolicies[1].PolicyDocument),
        PolicyName: 'Add',
        RoleName: 'deployment-role'
      }
    ]);
    expect(deleteRequests.map(({ input }) => input)).toEqual([{ PolicyName: 'Remove', RoleName: 'deployment-role' }]);
  });

  test('repairs an unrelated invalid principal while adding the requested user', async () => {
    const invalidPrincipal = 'arn:aws:iam::123456789012:user/deleted';
    const requestedPrincipal = 'arn:aws:iam::123456789012:user/current';
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { AWS: invalidPrincipal }
        }
      ]
    };
    const updates: UpdateAssumeRolePolicyCommand[] = [];
    const iam = iamWith((async (command: GetRoleCommand | UpdateAssumeRolePolicyCommand) => {
      if (command instanceof GetRoleCommand) {
        return {
          Role: {
            AssumeRolePolicyDocument: encodeURIComponent(JSON.stringify(policy)),
            Path: '/',
            RoleId: 'role-id',
            Arn: 'arn:aws:iam::123456789012:role/deployment-role',
            RoleName: 'deployment-role',
            CreateDate: new Date('2026-01-01T00:00:00.000Z')
          }
        };
      }
      updates.push(command);
      if (updates.length === 1) {
        throw new MalformedPolicyDocumentException({
          $metadata: {},
          message: `Invalid principal in policy: ${invalidPrincipal}`
        });
      }
      return {};
    }) as Send);

    await iam.addUserToRolePrincipals({ roleName: 'deployment-role', userArn: requestedPrincipal });

    expect(updates).toHaveLength(2);
    const repairedPolicy = JSON.parse(updates[1].input.PolicyDocument!);
    expect(repairedPolicy.Statement).toEqual([
      {
        Action: 'sts:AssumeRole',
        Effect: 'Allow',
        Principal: { AWS: requestedPrincipal }
      }
    ]);
  });
});

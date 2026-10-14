import { describe, expect, test } from 'bun:test';
import type { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { ListStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import { AwsCloudFormationStacks } from '../../src/aws/cloudformation-stacks';

type Send = CloudFormationClient['send'];

const capabilityWith = (send: Send) =>
  new AwsCloudFormationStacks({
    createClient: () => ({ send }) as CloudFormationClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

describe('CloudFormation stack operations', () => {
  test.each(['Stack with id example does not exist', 'Stack [example] does not exist'])(
    'treats a missing stack as empty: %s',
    async (message) => {
      const cloudFormation = capabilityWith((async () => {
        throw new Error(message);
      }) as Send);
      await expect(cloudFormation.getDetails('example')).resolves.toBeNull();
      await expect(cloudFormation.getResources('example')).resolves.toEqual([]);
    }
  );

  test.each(['AccessDenied', 'Stack [example] does not exist: permission denied'])(
    'preserves other failures: %s',
    async (message) => {
      const cloudFormation = capabilityWith((async () => {
        throw new Error(message);
      }) as Send);
      await expect(cloudFormation.getDetails('example')).rejects.toThrow('Could not fetch existing stack information.');
      await expect(cloudFormation.getResources('example')).rejects.toThrow(
        'Could not fetch existing stack information.'
      );
    }
  );

  test('keeps the exact CloudFormation no-update response as a successful skipped update', async () => {
    const cloudFormation = capabilityWith((async () => {
      throw new Error('No updates are to be performed.');
    }) as Send);

    await expect(cloudFormation.update('https://example.com/template.yml', { StackName: 'example' })).resolves.toEqual({
      skipped: true
    });
  });

  test('reports why CloudFormation failed a change set instead of waiting for it', async () => {
    let describeCalls = 0;
    const cloudFormation = capabilityWith((async (command: { input: object }) => {
      if ('TemplateBody' in command.input) return { Id: 'change-set', StackId: 'stack' };
      // Bounds a regression to a failed test instead of an endless poll.
      if (++describeCalls > 3) throw new Error('Still polling a failed change set.');
      return { Status: 'FAILED', StatusReason: 'No export named shared-vpc-id found.' };
    }) as Send);

    await expect(
      cloudFormation.createChangeSet({ StackName: 'example', ChangeSetName: 'preview', TemplateBody: '{}' })
    ).rejects.toThrow('No export named shared-vpc-id found.');
  });

  test('follows every stack-resource page in service order', async () => {
    const pages = [
      {
        StackResourceSummaries: [
          {
            LastUpdatedTimestamp: new Date('2026-01-01T00:00:00.000Z'),
            LogicalResourceId: 'First',
            ResourceStatus: 'CREATE_COMPLETE',
            ResourceType: 'AWS::S3::Bucket'
          }
        ],
        NextToken: 'page-2'
      },
      {
        StackResourceSummaries: [
          {
            LastUpdatedTimestamp: new Date('2026-01-01T00:00:01.000Z'),
            LogicalResourceId: 'Second',
            ResourceStatus: 'CREATE_COMPLETE',
            ResourceType: 'AWS::SQS::Queue'
          }
        ]
      }
    ];
    const cloudFormation = capabilityWith((async (command: ListStackResourcesCommand) => {
      if (pages.length === 1 && command.input.NextToken !== 'page-2') throw new Error('missing pagination token');
      return pages.shift();
    }) as Send);

    await expect(cloudFormation.getResources('example')).resolves.toEqual([
      {
        LastUpdatedTimestamp: new Date('2026-01-01T00:00:00.000Z'),
        LogicalResourceId: 'First',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceType: 'AWS::S3::Bucket'
      },
      {
        LastUpdatedTimestamp: new Date('2026-01-01T00:00:01.000Z'),
        LogicalResourceId: 'Second',
        ResourceStatus: 'CREATE_COMPLETE',
        ResourceType: 'AWS::SQS::Queue'
      }
    ]);
  });
});

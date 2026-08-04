import { describe, expect, test } from 'bun:test';
import type { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import {
  CreateStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  UpdateStackCommand
} from '@aws-sdk/client-cloudformation';
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
  test('serializes the synthesized template without changing the stack parameters', async () => {
    let command: CreateStackCommand | undefined;
    const cloudFormation = capabilityWith((async (candidate: CreateStackCommand) => {
      command = candidate;
      return { $metadata: {}, StackId: 'stack-id' };
    }) as Send);

    await expect(
      cloudFormation.create(
        { Resources: { Bucket: { Type: 'AWS::S3::Bucket' } } },
        { StackName: 'example', RoleARN: 'arn:aws:iam::123456789012:role/deploy' }
      )
    ).resolves.toMatchObject({ StackId: 'stack-id' });
    expect(command).toBeInstanceOf(CreateStackCommand);
    expect(command?.input).toEqual({
      StackName: 'example',
      RoleARN: 'arn:aws:iam::123456789012:role/deploy',
      TemplateBody: JSON.stringify({ Resources: { Bucket: { Type: 'AWS::S3::Bucket' } } })
    });
  });

  test('keeps the exact CloudFormation no-update response as a successful skipped update', async () => {
    const cloudFormation = capabilityWith((async (command: UpdateStackCommand) => {
      expect(command).toBeInstanceOf(UpdateStackCommand);
      expect(command.input).toEqual({ StackName: 'example', TemplateURL: 'https://example.com/template.yml' });
      throw new Error('No updates are to be performed.');
    }) as Send);

    await expect(cloudFormation.update('https://example.com/template.yml', { StackName: 'example' })).resolves.toEqual({
      skipped: true
    });
  });

  test('normalizes absent outputs and indexes present outputs by name', async () => {
    const pages = [
      {
        Stacks: [
          {
            StackName: 'with-outputs',
            CreationTime: new Date('2026-01-01T00:00:00.000Z'),
            StackStatus: 'CREATE_COMPLETE',
            Outputs: [
              { OutputKey: 'ApiUrl', OutputValue: 'https://example.com' },
              { OutputKey: 'BucketName', OutputValue: 'example-bucket' }
            ]
          }
        ]
      },
      {
        Stacks: [
          {
            StackName: 'without-outputs',
            CreationTime: new Date('2026-01-01T00:00:00.000Z'),
            StackStatus: 'CREATE_COMPLETE'
          }
        ]
      }
    ];
    const cloudFormation = capabilityWith((async (command: DescribeStacksCommand) => {
      expect(command).toBeInstanceOf(DescribeStacksCommand);
      return pages.shift();
    }) as Send);

    await expect(cloudFormation.getDetails('with-outputs')).resolves.toMatchObject({
      Outputs: [
        { OutputKey: 'ApiUrl', OutputValue: 'https://example.com' },
        { OutputKey: 'BucketName', OutputValue: 'example-bucket' }
      ],
      stackOutput: { ApiUrl: 'https://example.com', BucketName: 'example-bucket' }
    });
    await expect(cloudFormation.getDetails('without-outputs')).resolves.toMatchObject({
      Outputs: [],
      stackOutput: {}
    });
  });

  test('follows every stack-resource page in service order', async () => {
    const requests: ListStackResourcesCommand[] = [];
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
      requests.push(command);
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
    expect(requests.map(({ input }) => input)).toEqual([
      { StackName: 'example' },
      { StackName: 'example', NextToken: 'page-2' }
    ]);
  });
});

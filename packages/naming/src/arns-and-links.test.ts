import { describe, expect, test } from 'bun:test';
import { arns, getRoleArnFromSessionArn } from './arns';
import { consoleLinks } from './console-links';

describe('ARNs and AWS Console links', () => {
  test('preserves ARNs derived from physical resource names', () => {
    expect(
      arns.lambda({
        accountId: '123456789012',
        region: 'eu-west-1',
        stackName: 'my-project-dev',
        stacktapeResourceName: 'api'
      })
    ).toBe('arn:aws:lambda:eu-west-1:123456789012:function:my-project-dev-api');
    expect(getRoleArnFromSessionArn('arn:aws:sts::123456789012:assumed-role/deployer/session-id')).toBe(
      'arn:aws:iam::123456789012:role/deployer'
    );
  });

  test('preserves CloudFormation and CloudWatch URL encoding', () => {
    expect(
      consoleLinks.stackUrl(
        'eu-west-1',
        'arn:aws:cloudformation:eu-west-1:123456789012:stack/my project/id',
        'resources'
      )
    ).toBe(
      'https://eu-west-1.console.aws.amazon.com/cloudformation/home?region=eu-west-1#stacks/resources?stackId=arn%3Aaws%3Acloudformation%3Aeu-west-1%3A123456789012%3Astack%2Fmy%20project%2Fid'
    );
    expect(consoleLinks.logGroup('eu-west-1', '/aws/lambda/my function')).toBe(
      'https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/%252Faws%252Flambda%252Fmy%2520function'
    );
  });

  test('preserves service-specific URLs', () => {
    expect(consoleLinks.sqsQueue('eu-west-1', '123456789012', 'jobs.fifo')).toBe(
      'https://eu-west-1.console.aws.amazon.com/sqs/v2/home?region=eu-west-1#/queues/https%3A%2F%2Fsqs.eu-west-1.amazonaws.com%2F123456789012%2Fjobs.fifo'
    );
    expect(consoleLinks.dsqlClusters('eu-west-1')).toBe(
      'https://eu-west-1.console.aws.amazon.com/dsql/home?region=eu-west-1#/clusters'
    );
    expect(consoleLinks.createCertificateUrl('cdn', 'eu-west-1')).toBe(
      'https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/request'
    );
  });
});

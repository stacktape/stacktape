import { describe, expect, test } from 'bun:test';
import { CliError } from '@utils/errors';
import { scopeToStackWithoutOutputs, summarizeStackEvents } from './stack-without-outputs';

const stackName = 'shop-dev';
const stackId = 'arn:aws:cloudformation:eu-north-1:123456789012:stack/shop-dev/0b1c';

const codeOf = (call: () => unknown) => {
  try {
    call();
  } catch (error) {
    return (error as CliError).code;
  }
  return undefined;
};

// r2qq finding 6: after a first dev start failed before the stack had outputs, aws read nothing, not even its events.
describe('aws:call against a stack whose first deployment failed before it had outputs', () => {
  test('reads that stack’s CloudFormation events, by its ID when no StackName is given', () => {
    expect(
      scopeToStackWithoutOutputs({
        service: 'cloudformation',
        command: 'DescribeStackEvents',
        input: {},
        stackName,
        stackId
      })
    ).toEqual({ StackName: stackId });
    expect(
      scopeToStackWithoutOutputs({
        service: 'cloudformation',
        command: 'DescribeStackResourcesCommand',
        input: { StackName: stackName },
        stackName,
        stackId
      })
    ).toEqual({ StackName: stackName });
  });

  test('refuses other stacks, account-wide listings and other services', () => {
    expect(
      codeOf(() =>
        scopeToStackWithoutOutputs({
          service: 'cloudformation',
          command: 'DescribeStackEvents',
          input: { StackName: 'other-prod' },
          stackName,
          stackId
        })
      )
    ).toBe('CLI_AWS_CALL_STACK_NOT_TARGET');
    expect(
      codeOf(() =>
        scopeToStackWithoutOutputs({ service: 'cloudformation', command: 'ListStacks', input: {}, stackName, stackId })
      )
    ).toBe('CLI_AWS_CALL_STACK_HAS_NO_OUTPUTS');
    expect(
      codeOf(() => scopeToStackWithoutOutputs({ service: 'lambda', command: 'ListFunctions', input: {}, stackName }))
    ).toBe('CLI_AWS_CALL_STACK_HAS_NO_OUTPUTS');
  });
});

test('stack events of a failed deployment keep the resource, status and reason, not the repeated properties and IDs', () => {
  expect(
    summarizeStackEvents({
      StackEvents: [
        {
          StackId: stackId,
          EventId: 'BrokenFn-CREATE_FAILED-2026-10-28T16:05:00.000Z',
          LogicalResourceId: 'BrokenFn',
          ResourceStatus: 'CREATE_FAILED',
          ResourceStatusReason: 'The role defined for the function cannot be assumed by Lambda.',
          ResourceProperties: JSON.stringify({ Code: { ZipFile: 'x'.repeat(2000) } })
        }
      ],
      NextToken: 'next'
    })
  ).toEqual({
    StackEvents: [
      {
        LogicalResourceId: 'BrokenFn',
        ResourceStatus: 'CREATE_FAILED',
        ResourceStatusReason: 'The role defined for the function cannot be assumed by Lambda.'
      }
    ],
    NextToken: 'next'
  });
});

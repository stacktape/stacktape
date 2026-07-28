import { describe, expect, test } from 'bun:test';
import {
  AWS_READ_ONLY_OPERATIONS,
  getReadOnlyAwsOperations,
  isReadOnlyAwsCommand,
  resolveAwsServiceName
} from './aws-read-only-operations';

describe('aws:call read-only allowlist', () => {
  test('rejects Step Functions GetActivityTask, which claims a task rather than observing one', () => {
    // The operation this allowlist exists for: a `Get*` name that starts a task's timeout, records `ActivityStarted`
    // and can take work from the worker that should have received it.
    expect(isReadOnlyAwsCommand('sfn', 'GetActivityTask')).toBe(false);
    expect(isReadOnlyAwsCommand('stepfunctions', 'GetActivityTask')).toBe(false);
    expect(isReadOnlyAwsCommand('sfn', 'GetActivityTaskCommand')).toBe(false);
    expect(AWS_READ_ONLY_OPERATIONS.sfn).not.toContain('GetActivityTask');

    // The Step Functions reads it does accept still work.
    expect(isReadOnlyAwsCommand('sfn', 'DescribeExecution')).toBe(true);
    expect(isReadOnlyAwsCommand('sfn', 'GetExecutionHistory')).toBe(true);
  });

  test('rejects the mutating operations the old prefix rule let through', () => {
    for (const [service, command] of [
      ['dynamodb', 'BatchWriteItem'],
      ['dynamodb', 'BatchExecuteStatement'],
      ['dynamodb', 'ExecuteStatement'],
      ['dynamodb', 'PutItem'],
      ['dynamodb', 'DeleteItem'],
      ['dynamodb', 'UpdateItem'],
      ['ecr', 'BatchDeleteImage'],
      ['ecr', 'GetAuthorizationToken'],
      ['s3', 'PutObject'],
      ['s3', 'DeleteObject'],
      ['sns', 'Publish'],
      ['lambda', 'Invoke'],
      ['lambda', 'UpdateFunctionCode'],
      ['sqs', 'SendMessage'],
      ['sqs', 'DeleteMessage'],
      ['sqs', 'ReceiveMessage'],
      ['sfn', 'StartExecution'],
      ['eventbridge', 'PutEvents'],
      ['logs', 'DeleteLogGroup'],
      ['logs', 'StartQuery'],
      ['ec2', 'TerminateInstances'],
      ['cloudformation', 'DetectStackDrift'],
      ['sts', 'GetSessionToken'],
      ['sts', 'AssumeRole'],
      ['xray', 'GetSamplingTargets']
    ] as const) {
      expect(isReadOnlyAwsCommand(service, command)).toBe(false);
    }
  });

  test('accepts a reviewed operation only on the service it was reviewed for', () => {
    expect(isReadOnlyAwsCommand('cloudformation', 'DescribeStacks')).toBe(true);
    expect(isReadOnlyAwsCommand('lambda', 'DescribeStacks')).toBe(false);

    expect(isReadOnlyAwsCommand('dynamodb', 'Scan')).toBe(true);
    expect(isReadOnlyAwsCommand('s3', 'Scan')).toBe(false);

    expect(isReadOnlyAwsCommand('logs', 'FilterLogEvents')).toBe(true);
    expect(isReadOnlyAwsCommand('cloudwatch', 'FilterLogEvents')).toBe(false);

    expect(isReadOnlyAwsCommand('lambda', 'ListFunctions')).toBe(true);
    expect(isReadOnlyAwsCommand('sts', 'ListFunctions')).toBe(false);

    expect(isReadOnlyAwsCommand('s3', 'HeadObject')).toBe(true);
    expect(isReadOnlyAwsCommand('dynamodb', 'HeadObject')).toBe(false);
  });

  test('resolves the alternate service spellings to the same operations', () => {
    for (const [alias, canonical] of [
      ['stepfunctions', 'sfn'],
      ['events', 'eventbridge'],
      ['elb', 'elbv2']
    ] as const) {
      expect(resolveAwsServiceName(alias)).toBe(canonical);
      expect(getReadOnlyAwsOperations(alias)).toBe(AWS_READ_ONLY_OPERATIONS[canonical]);
    }

    expect(isReadOnlyAwsCommand('stepfunctions', 'ListStateMachines')).toBe(true);
    expect(isReadOnlyAwsCommand('events', 'ListRules')).toBe(true);
    expect(isReadOnlyAwsCommand('elb', 'DescribeTargetHealth')).toBe(true);
    expect(isReadOnlyAwsCommand('ELB', 'DescribeTargetHealth')).toBe(true);
  });

  test('judges the `Command`-suffixed spelling the executor also accepts', () => {
    expect(isReadOnlyAwsCommand('dynamodb', 'GetItemCommand')).toBe(true);
    expect(isReadOnlyAwsCommand('dynamodb', 'ScanCommand')).toBe(true);
    expect(isReadOnlyAwsCommand('dynamodb', 'BatchWriteItemCommand')).toBe(false);
    expect(isReadOnlyAwsCommand('s3', 'PutObjectCommand')).toBe(false);
  });

  test('defaults to rejection for anything it has not been told about', () => {
    // Unknown service, including one whose client exists nowhere in the CLI.
    expect(resolveAwsServiceName('glacier')).toBeUndefined();
    expect(getReadOnlyAwsOperations('glacier')).toEqual([]);
    expect(isReadOnlyAwsCommand('glacier', 'ListVaults')).toBe(false);

    // Unknown operation on a known service, including read-looking names that were never reviewed.
    expect(isReadOnlyAwsCommand('lambda', 'GetProvisionedConcurrencyConfig')).toBe(false);
    expect(isReadOnlyAwsCommand('s3', 'ListSomethingInvented')).toBe(false);

    // Inherited object properties are not services or operations.
    expect(resolveAwsServiceName('constructor')).toBeUndefined();
    expect(isReadOnlyAwsCommand('constructor', 'toString')).toBe(false);
    expect(isReadOnlyAwsCommand('lambda', 'toString')).toBe(false);

    // Operation names are matched exactly, not by prefix, suffix or case.
    expect(isReadOnlyAwsCommand('lambda', 'listFunctions')).toBe(false);
    expect(isReadOnlyAwsCommand('dynamodb', 'DeleteBatchGetItem')).toBe(false);
    expect(isReadOnlyAwsCommand('sts', 'CreateGetCallerIdentity')).toBe(false);
  });
});

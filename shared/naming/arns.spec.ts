import { describe, expect, test } from 'bun:test';
import { arns } from './arns';

describe('arns utilities', () => {
  describe('lambda', () => {
    test('should generate valid Lambda ARN', () => {
      const arn = arns.lambda({
        accountId: '123456789012',
        stackName: 'my-stack',
        stacktapeResourceName: 'my-function',
        region: 'us-east-1'
      });

      expect(arn).toContain('arn:aws:lambda:');
      expect(arn).toContain('us-east-1');
      expect(arn).toContain('123456789012');
      expect(arn).toContain('function:');
    });

    test('should handle different regions', () => {
      const arnEast = arns.lambda({
        accountId: '123456789012',
        stackName: 'stack',
        stacktapeResourceName: 'func',
        region: 'us-east-1'
      });
      const arnWest = arns.lambda({
        accountId: '123456789012',
        stackName: 'stack',
        stacktapeResourceName: 'func',
        region: 'us-west-2'
      });

      expect(arnEast).toContain('us-east-1');
      expect(arnWest).toContain('us-west-2');
      expect(arnEast).not.toBe(arnWest);
    });
  });

  describe('lambdaFromFullName', () => {
    test('should generate Lambda ARN from full name', () => {
      const arn = arns.lambdaFromFullName({
        accountId: '123456789012',
        region: 'eu-west-1',
        lambdaAwsName: 'my-full-function-name'
      });

      expect(arn).toBe('arn:aws:lambda:eu-west-1:123456789012:function:my-full-function-name');
    });

    test('should handle different AWS names', () => {
      const arn = arns.lambdaFromFullName({
        accountId: '999888777666',
        region: 'ap-southeast-1',
        lambdaAwsName: 'custom-lambda-name'
      });

      expect(arn).toContain('custom-lambda-name');
      expect(arn).toContain('ap-southeast-1');
      expect(arn).toContain('999888777666');
    });
  });

  describe('wildcardContainerService', () => {
    test('should generate wildcard ECS service ARN', () => {
      const arn = arns.wildcardContainerService({
        accountId: '123456789012',
        stackName: 'my-stack',
        workloadName: 'web-service',
        region: 'us-east-1'
      });

      expect(arn).toContain('arn:aws:ecs:');
      expect(arn).toContain('service/');
      expect(arn).toContain('us-east-1');
      expect(arn).toContain('*');
    });

    test('should end with wildcard', () => {
      const arn = arns.wildcardContainerService({
        accountId: '123456789012',
        stackName: 'stack',
        workloadName: 'service',
        region: 'us-west-2'
      });

      expect(arn.endsWith('*')).toBe(true);
    });
  });

  describe('iamRole', () => {
    test('should generate IAM role ARN', () => {
      const arn = arns.iamRole({
        accountId: '123456789012',
        roleAwsName: 'MyRole'
      });

      expect(arn).toBe('arn:aws:iam::123456789012:role/MyRole');
    });

    test('should not include region', () => {
      const arn = arns.iamRole({
        accountId: '123456789012',
        roleAwsName: 'TestRole'
      });

      expect(arn).not.toContain('us-east-1');
      expect(arn).not.toContain('us-west-2');
      expect(arn).toMatch(/^arn:aws:iam::\d+:role\//);
    });
  });

  describe('cloudwatchAlarm', () => {
    test('should generate CloudWatch alarm ARN', () => {
      const arn = arns.cloudwatchAlarm({
        accountId: '123456789012',
        region: 'us-east-1',
        alarmAwsName: 'HighCPU'
      });

      expect(arn).toBe('arn:aws:cloudwatch:us-east-1:123456789012:alarm:HighCPU');
    });

    test('should handle different alarm names', () => {
      const arn = arns.cloudwatchAlarm({
        accountId: '123456789012',
        region: 'eu-central-1',
        alarmAwsName: 'LowMemory'
      });

      expect(arn).toContain('LowMemory');
      expect(arn).toContain('eu-central-1');
    });
  });

  describe('sqsQueue', () => {
    test('should generate SQS queue ARN', () => {
      const arn = arns.sqsQueue({
        accountId: '123456789012',
        region: 'us-east-1',
        sqsQueueAwsName: 'my-queue'
      });

      expect(arn).toBe('arn:aws:sqs:us-east-1:123456789012:my-queue');
    });

    test('should handle FIFO queues', () => {
      const arn = arns.sqsQueue({
        accountId: '123456789012',
        region: 'us-west-2',
        sqsQueueAwsName: 'my-queue.fifo'
      });

      expect(arn).toContain('my-queue.fifo');
      expect(arn).toContain('sqs');
    });
  });

  describe('snsTopic', () => {
    test('should generate SNS topic ARN', () => {
      const arn = arns.snsTopic({
        accountId: '123456789012',
        region: 'us-east-1',
        snsTopicAwsName: 'my-topic'
      });

      expect(arn).toBe('arn:aws:sns:us-east-1:123456789012:my-topic');
    });

    test('should handle different topic names', () => {
      const arn = arns.snsTopic({
        accountId: '999888777666',
        region: 'ap-northeast-1',
        snsTopicAwsName: 'notifications'
      });

      expect(arn).toContain('notifications');
      expect(arn).toContain('ap-northeast-1');
      expect(arn).toContain('sns');
    });
  });

  describe('ARN format consistency', () => {
    test('all ARNs should start with arn:aws:', () => {
      const lambdaArn = arns.lambda({
        accountId: '123456789012',
        stackName: 'stack',
        stacktapeResourceName: 'func',
        region: 'us-east-1'
      });
      const iamArn = arns.iamRole({ accountId: '123456789012', roleAwsName: 'role' });
      const sqsArn = arns.sqsQueue({
        accountId: '123456789012',
        region: 'us-east-1',
        sqsQueueAwsName: 'queue'
      });

      expect(lambdaArn).toMatch(/^arn:aws:/);
      expect(iamArn).toMatch(/^arn:aws:/);
      expect(sqsArn).toMatch(/^arn:aws:/);
    });

    test('regional ARNs should include region', () => {
      const lambdaArn = arns.lambda({
        accountId: '123456789012',
        stackName: 'stack',
        stacktapeResourceName: 'func',
        region: 'us-east-1'
      });
      const sqsArn = arns.sqsQueue({
        accountId: '123456789012',
        region: 'eu-west-1',
        sqsQueueAwsName: 'queue'
      });

      expect(lambdaArn).toContain(':us-east-1:');
      expect(sqsArn).toContain(':eu-west-1:');
    });

    test('all ARNs should contain account ID', () => {
      const accountId = '123456789012';
      const lambdaArn = arns.lambda({
        accountId,
        stackName: 'stack',
        stacktapeResourceName: 'func',
        region: 'us-east-1'
      });
      const iamArn = arns.iamRole({ accountId, roleAwsName: 'role' });

      expect(lambdaArn).toContain(accountId);
      expect(iamArn).toContain(accountId);
    });
  });
});

import { describe, expect, test } from 'bun:test';
import { helperLambdaAwsResourceNames } from './helper-lambdas-resource-names';

describe('helper-lambdas-resource-names', () => {
  describe('originRequestEdgeLambda', () => {
    test('should generate origin request edge lambda name', () => {
      const name = helperLambdaAwsResourceNames.originRequestEdgeLambda('my-stack', 'us-east-1');
      expect(name).toContain('my-stack');
      expect(name).toContain('stpOReq');
      expect(name).toContain('us-east-1');
    });

    test('should respect 64 character limit', () => {
      const longStackName = 'a'.repeat(100);
      const name = helperLambdaAwsResourceNames.originRequestEdgeLambda(longStackName, 'us-east-1');
      expect(name.length).toBeLessThanOrEqual(64);
    });
  });

  describe('originResponseEdgeLambda', () => {
    test('should generate origin response edge lambda name', () => {
      const name = helperLambdaAwsResourceNames.originResponseEdgeLambda('my-stack', 'eu-west-1');
      expect(name).toContain('my-stack');
      expect(name).toContain('stpORes');
      expect(name).toContain('eu-west-1');
    });

    test('should respect 64 character limit', () => {
      const longStackName = 'x'.repeat(100);
      const name = helperLambdaAwsResourceNames.originResponseEdgeLambda(longStackName, 'ap-south-1');
      expect(name.length).toBeLessThanOrEqual(64);
    });
  });

  describe('edgeDeploymentBucket', () => {
    test('should generate edge deployment bucket name', () => {
      const name = helperLambdaAwsResourceNames.edgeDeploymentBucket('abc123');
      expect(name).toBe('stp-edge-deployment-bucket-abc123');
    });

    test('should include hash in bucket name', () => {
      const name = helperLambdaAwsResourceNames.edgeDeploymentBucket('xyz789');
      expect(name).toContain('xyz789');
      expect(name).toMatch(/^stp-edge-deployment-bucket-/);
    });
  });
});

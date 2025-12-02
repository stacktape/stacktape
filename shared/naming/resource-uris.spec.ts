import { Ref } from '@cloudform/functions';
import { describe, expect, test } from 'bun:test';
import { resourceURIs } from './resource-uris';

describe('resource-uris', () => {
  describe('lambdaAuthorizer', () => {
    test('should generate Lambda authorizer URI with string ARN', () => {
      const arn = 'arn:aws:lambda:us-east-1:123456789012:function:my-authorizer';
      const uri = resourceURIs.lambdaAuthorizer({
        lambdaEndpointArn: arn,
        region: 'us-east-1'
      });
      expect(uri).toBeDefined();
      expect(JSON.stringify(uri)).toContain('apigateway');
      expect(JSON.stringify(uri)).toContain('us-east-1');
      expect(JSON.stringify(uri)).toContain('lambda:path');
      expect(JSON.stringify(uri)).toContain('2015-03-31');
    });

    test('should generate Lambda authorizer URI with intrinsic function', () => {
      const uri = resourceURIs.lambdaAuthorizer({
        lambdaEndpointArn: Ref('AuthorizerFunctionArn'),
        region: 'eu-west-1'
      });
      expect(uri).toBeDefined();
      expect(JSON.stringify(uri)).toContain('Ref');
      expect(JSON.stringify(uri)).toContain('eu-west-1');
    });

    test('should include invocations path', () => {
      const uri = resourceURIs.lambdaAuthorizer({
        lambdaEndpointArn: 'arn:aws:lambda:region:account:function:fn',
        region: 'us-west-2'
      });
      expect(JSON.stringify(uri)).toContain('invocations');
    });

    test('should work with different regions', () => {
      const regions: Array<'us-east-1' | 'eu-west-1' | 'ap-south-1'> = ['us-east-1', 'eu-west-1', 'ap-south-1'];
      regions.forEach((region) => {
        const uri = resourceURIs.lambdaAuthorizer({
          lambdaEndpointArn: 'arn',
          region
        });
        expect(JSON.stringify(uri)).toContain(region);
      });
    });

    test('should use API Gateway ARN format', () => {
      const uri = resourceURIs.lambdaAuthorizer({
        lambdaEndpointArn: 'test-arn',
        region: 'us-east-1'
      });
      const uriStr = JSON.stringify(uri);
      expect(uriStr).toContain('arn:aws:apigateway');
      expect(uriStr).toContain('lambda:path');
    });

    test('should use 2015-03-31 API version', () => {
      const uri = resourceURIs.lambdaAuthorizer({
        lambdaEndpointArn: 'arn',
        region: 'us-east-1'
      });
      expect(JSON.stringify(uri)).toContain('2015-03-31');
    });
  });

  describe('bucket', () => {
    test('should generate S3 bucket URI', () => {
      const uri = resourceURIs.bucket({
        bucketName: 'my-bucket',
        region: 'us-east-1'
      });
      expect(uri).toBe('my-bucket.s3.us-east-1.amazonaws.com');
    });

    test('should include bucket name', () => {
      const uri = resourceURIs.bucket({
        bucketName: 'test-bucket-123',
        region: 'us-west-2'
      });
      expect(uri).toContain('test-bucket-123');
    });

    test('should include region', () => {
      const uri = resourceURIs.bucket({
        bucketName: 'bucket',
        region: 'eu-central-1'
      });
      expect(uri).toContain('eu-central-1');
    });

    test('should use S3 domain format', () => {
      const uri = resourceURIs.bucket({
        bucketName: 'bucket',
        region: 'us-east-1'
      });
      expect(uri).toMatch(/^[\w-]+\.s3\.[\w-]+\.amazonaws\.com$/);
    });

    test('should work with different regions', () => {
      const regions: Array<'us-east-1' | 'eu-west-1' | 'ap-southeast-1'> = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
      regions.forEach((region) => {
        const uri = resourceURIs.bucket({
          bucketName: 'my-bucket',
          region
        });
        expect(uri).toBe(`my-bucket.s3.${region}.amazonaws.com`);
      });
    });

    test('should handle bucket names with hyphens', () => {
      const uri = resourceURIs.bucket({
        bucketName: 'my-test-bucket-prod',
        region: 'us-east-1'
      });
      expect(uri).toBe('my-test-bucket-prod.s3.us-east-1.amazonaws.com');
    });

    test('should handle bucket names with numbers', () => {
      const uri = resourceURIs.bucket({
        bucketName: 'bucket123456',
        region: 'us-west-2'
      });
      expect(uri).toBe('bucket123456.s3.us-west-2.amazonaws.com');
    });

    test('should maintain consistent format', () => {
      const uri1 = resourceURIs.bucket({
        bucketName: 'bucket',
        region: 'us-east-1'
      });
      const uri2 = resourceURIs.bucket({
        bucketName: 'bucket',
        region: 'us-east-1'
      });
      expect(uri1).toBe(uri2);
    });
  });

  describe('integration - both methods', () => {
    test('should be independent functions', () => {
      const lambdaUri = resourceURIs.lambdaAuthorizer({
        lambdaEndpointArn: 'arn',
        region: 'us-east-1'
      });
      const bucketUri = resourceURIs.bucket({
        bucketName: 'bucket',
        region: 'us-east-1'
      });

      expect(lambdaUri).toBeDefined();
      expect(bucketUri).toBeDefined();
      expect(typeof bucketUri).toBe('string');
      expect(JSON.stringify(lambdaUri)).not.toBe(bucketUri);
    });

    test('should handle same region differently', () => {
      const region = 'us-east-1';
      const lambdaUri = resourceURIs.lambdaAuthorizer({
        lambdaEndpointArn: 'arn',
        region
      });
      const bucketUri = resourceURIs.bucket({
        bucketName: 'bucket',
        region
      });

      expect(JSON.stringify(lambdaUri)).toContain(region);
      expect(bucketUri).toContain(region);
    });
  });
});

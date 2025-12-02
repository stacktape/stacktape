import { describe, expect, mock, test } from 'bun:test';
import { getSignedGetCallerIdentityRequest } from './identity';

// Mock AWS SDK modules
mock.module('@aws-sdk/client-sts', () => ({
  STSClient: mock(function (config) {
    // @ts-expect-error - this is a mock
    this.config = config;
  }),
  GetCallerIdentityCommand: mock(function (input) {
    // @ts-expect-error - this is a mock
    this.input = input;
  })
}));

mock.module('@aws-sdk/signature-v4', () => ({
  SignatureV4: class {
    config: any;
    constructor(config: any) {
      this.config = config;
    }

    async sign(request: any) {
      return {
        ...request,
        headers: {
          ...request.headers,
          'X-Amz-Date': '20240101T000000Z',
          Authorization: 'AWS4-HMAC-SHA256 Credential=...'
        }
      };
    }
  }
}));

mock.module('@aws-sdk/util-create-request', () => ({
  createRequest: mock(async () => ({
    method: 'POST',
    hostname: 'sts.amazonaws.com',
    path: '/',
    headers: {}
  }))
}));

describe('identity', () => {
  describe('getSignedGetCallerIdentityRequest', () => {
    const mockCredentials: AwsCredentials = {
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      sessionToken: 'token123'
    };

    test('should create signed GetCallerIdentity request', async () => {
      const result = await getSignedGetCallerIdentityRequest({
        credentials: mockCredentials,
        region: 'us-east-1'
      });

      expect(result).toBeDefined();
      expect(result.method).toBe('POST');
      expect(result.headers).toBeDefined();
    });

    test('should include authorization header', async () => {
      const result = await getSignedGetCallerIdentityRequest({
        credentials: mockCredentials,
        region: 'us-east-1'
      });

      expect(result.headers.Authorization).toBeDefined();
      expect(result.headers.Authorization).toContain('AWS4-HMAC-SHA256');
    });

    test('should include date header', async () => {
      const result = await getSignedGetCallerIdentityRequest({
        credentials: mockCredentials,
        region: 'us-west-2'
      });

      expect(result.headers['X-Amz-Date']).toBeDefined();
    });

    test('should work with different regions', async () => {
      const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];

      for (const region of regions) {
        const result = await getSignedGetCallerIdentityRequest({
          credentials: mockCredentials,
          region
        });

        expect(result).toBeDefined();
        expect(result.headers).toBeDefined();
      }
    });

    test('should work with credentials without session token', async () => {
      const credsWithoutToken = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      };

      const result = await getSignedGetCallerIdentityRequest({
        credentials: credsWithoutToken as AwsCredentials,
        region: 'us-east-1'
      });

      expect(result).toBeDefined();
    });
  });
});

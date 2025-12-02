import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { AwsIdentityProtectedClient, createTrpcAwsIdentityProtectedClient } from './aws-identity-protected';

// Mock dependencies
mock.module('@trpc/client', () => ({
  createTRPCClient: mock(() => ({
    validateCertificate: { mutate: mock(async () => {}) },
    upsertDefaultDomainDnsRecord: { mutate: mock(async () => {}) },
    deleteDefaultDomainDnsRecord: { mutate: mock(async () => {}) }
  })),
  httpBatchLink: mock((config) => config)
}));

mock.module('../aws/identity', () => ({
  getSignedGetCallerIdentityRequest: mock(async () => ({
    method: 'POST',
    headers: { 'x-amz-signature': 'mock-signature' }
  }))
}));

describe('aws-identity-protected', () => {
  const mockCredentials: AwsCredentials = {
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    sessionToken: 'test-token'
  };
  const mockRegion = 'us-east-1';
  const mockApiUrl = 'https://api.example.com/trpc';

  describe('createTrpcAwsIdentityProtectedClient', () => {
    test('should create TRPC client with correct configuration', () => {
      const client = createTrpcAwsIdentityProtectedClient({
        credentials: mockCredentials,
        region: mockRegion,
        apiUrl: mockApiUrl
      });

      expect(client).toBeDefined();
    });
  });

  describe('AwsIdentityProtectedClient', () => {
    let client: AwsIdentityProtectedClient;

    beforeEach(() => {
      client = new AwsIdentityProtectedClient();
    });

    test('should initialize client', async () => {
      await client.init({
        credentials: mockCredentials,
        region: mockRegion,
        apiUrl: mockApiUrl
      });

      expect(client).toBeDefined();
    });

    test('should have validateCertificate method', () => {
      expect(client.validateCertificate).toBeDefined();
      expect(client.validateCertificate.mutate).toBeDefined();
    });

    test('should have upsertDefaultDomainDnsRecord method', () => {
      expect(client.upsertDefaultDomainDnsRecord).toBeDefined();
      expect(client.upsertDefaultDomainDnsRecord.mutate).toBeDefined();
    });

    test('should have deleteDefaultDomainDnsRecord method', () => {
      expect(client.deleteDefaultDomainDnsRecord).toBeDefined();
      expect(client.deleteDefaultDomainDnsRecord.mutate).toBeDefined();
    });

    test('should call validateCertificate with correct params', async () => {
      await client.init({
        credentials: mockCredentials,
        region: mockRegion,
        apiUrl: mockApiUrl
      });

      const params = { certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc123', version: 1 };
      await expect(client.validateCertificate.mutate(params)).resolves.toBeUndefined();
    });
  });
});

import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ApiKeyProtectedClient } from './api-key-protected';

// Mock TRPC client
const mockTrpcClient = {
  recordStackOperation: { mutate: mock(async () => {}) },
  globalConfig: { query: mock(async () => ({ alarms: [], guardrails: [], deploymentNotifications: [] })) },
  currentUserAndOrgData: {
    query: mock(async () => ({
      user: { id: 'user-1' },
      organization: { id: 'org-1', name: 'Test Org' },
      connectedAwsAccounts: [],
      projects: []
    }))
  },
  awsAccountCredentials: {
    query: mock(async () => ({
      credentials: {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        expiration: '2024-01-01T00:00:00Z'
      }
    }))
  },
  template: { query: mock(async () => ({ id: 'template-1', organizationId: 'org-1' })) },
  canDeploy: { query: mock(async () => ({ canDeploy: true })) },
  defaultDomainsInfo: {
    query: mock(async () => ({ suffix: '.example.com', certDomainSuffix: '.cert.example.com', version: 1 }))
  },
  createProjectFromCli: {
    mutate: mock(async () => ({ id: 'project-1', name: 'Test Project', organizationId: 'org-1' }))
  },
  deleteUndeployedStageFromCli: { mutate: mock(async () => ({ success: true })) }
};

mock.module('@trpc/client', () => ({
  createTRPCClient: mock(() => mockTrpcClient),
  httpBatchLink: mock((config) => config)
}));

describe('api-key-protected', () => {
  let client: ApiKeyProtectedClient;

  beforeEach(() => {
    client = new ApiKeyProtectedClient();
  });

  describe('ApiKeyProtectedClient', () => {
    test('should initialize client with API key', async () => {
      await client.init({ apiKey: 'test-api-key' });
      expect(client).toBeDefined();
    });

    test('should record stack operation', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const params = { invocationId: 'inv-1', command: 'deploy', stackName: 'test-stack' };
      await expect(client.recordStackOperation(params)).resolves.toBeUndefined();
    });

    test('should get global config', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const config = await client.globalConfig();
      expect(config).toBeDefined();
      expect(config.alarms).toEqual([]);
      expect(config.guardrails).toEqual([]);
    });

    test('should get current user and org data', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const data = await client.currentUserAndOrgData();
      expect(data.user).toBeDefined();
      expect(data.organization).toBeDefined();
      expect(data.user.id).toBe('user-1');
    });

    test('should get AWS account credentials', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const creds = await client.awsAccountCredentials({ awsAccountName: 'test-account' });
      expect(creds.credentials).toBeDefined();
      expect(creds.credentials.accessKeyId).toBe('test-key');
    });

    test('should get template', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const template = await client.template({ templateId: 'template-1' });
      expect(template.id).toBe('template-1');
    });

    test('should check canDeploy', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const result = await client.canDeploy();
      expect(result.canDeploy).toBe(true);
    });

    test('should get default domains info', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const info = await client.defaultDomainsInfo({
        stackName: 'test-stack',
        region: 'us-east-1',
        awsAccountId: '123456789012'
      });
      expect(info.suffix).toBe('.example.com');
      expect(info.version).toBe(1);
    });

    test('should create project', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const project = await client.createProject({ name: 'Test Project' });
      expect(project.id).toBe('project-1');
      expect(project.name).toBe('Test Project');
    });

    test('should delete undeployed stage', async () => {
      await client.init({ apiKey: 'test-api-key' });
      const result = await client.deleteUndeployedStage({
        projectName: 'test-project',
        stageName: 'dev'
      });
      expect(result.success).toBe(true);
    });
  });
});

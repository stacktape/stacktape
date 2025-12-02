import { describe, expect, mock, test } from 'bun:test';

// Mock dependencies
mock.module('@shared/naming/aws-resource-names', () => ({
  awsResourceNames: new Proxy(
    {
      codebuildServiceRole: mock(() => 'stp-codebuild-role'),
      stackOperationsLogGroup: mock(() => '/aws/stacktape/operations'),
      codebuildProject: mock((region) => `stp-codebuild-${region}`),
      codebuildDeploymentBucket: mock((region, accountId) => `stp-codebuild-${region}-${accountId}`)
    },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return mock((...args) => `mock-${String(prop)}-${args.join('-')}`);
      }
    }
  )
}));

mock.module('@shared/naming/ssm-secret-parameters', () => ({
  getStacktapeApiKeySsmParameterName: mock(() => '/stacktape/api-key')
}));

mock.module('@shared/naming/utils', () => ({
  getStackName: mock((project, stage) => `${project}-${stage}`)
}));

mock.module('@shared/utils/misc', () => ({
  wait: mock(async () => {})
}));

describe('codebuild', () => {
  describe('preparePipelineResources', () => {
    test('should create all required resources', async () => {
      const mockAwsSdkManager: any = {
        region: 'us-east-1',
        getRole: mock(async () => null),
        createIamRole: mock(async () => ({ Arn: 'arn:aws:iam::123:role/test', RoleName: 'test-role' })),
        updateIamRoleAssumePolicy: mock(async () => {}),
        attachPolicyToRole: mock(async () => {}),
        getLogGroup: mock(async () => null),
        createLogGroup: mock(async () => ({ logGroupName: '/aws/test' })),
        getCodebuildProject: mock(async () => null),
        createDummyCodebuildProject: mock(async () => ({ name: 'test-project' })),
        bucketExists: mock(async () => false),
        createBucket: mock(async () => {})
      };

      const { preparePipelineResources } = await import('./codebuild');
      const result = await preparePipelineResources({
        awsSdkManager: mockAwsSdkManager,
        awsAccountId: '123456789012'
      });

      expect(result.bucketName).toBeDefined();
      expect(result.logGroupName).toBeDefined();
      expect(result.codebuildProjectName).toBeDefined();
      expect(result.roleArn).toBeDefined();
    });

    test('should reuse existing resources', async () => {
      const mockAwsSdkManager: any = {
        region: 'us-east-1',
        getRole: mock(async () => ({ Arn: 'arn:aws:iam::123:role/existing', RoleName: 'existing-role' })),
        getLogGroup: mock(async () => ({ logGroupName: '/aws/existing' })),
        getCodebuildProject: mock(async () => ({ name: 'existing-project' })),
        bucketExists: mock(async () => true)
      };

      const { preparePipelineResources } = await import('./codebuild');
      const result = await preparePipelineResources({
        awsSdkManager: mockAwsSdkManager,
        awsAccountId: '123456789012'
      });

      expect(result).toBeDefined();
      expect(mockAwsSdkManager.getRole).toHaveBeenCalled();
    });
  });

  describe('startCodebuildDeployment', () => {
    test('should start codebuild deployment', async () => {
      const mockAwsSdkManager: any = {
        region: 'us-east-1',
        putSsmParameterValue: mock(async () => {}),
        startCodebuildDeployment: mock(async () => ({
          id: 'build-123',
          arn: 'arn:aws:codebuild:us-east-1:123:build/test:build-123'
        })),
        waitForCodebuildDeploymentToReachBuildPhase: mock(async () => {}),
        deleteSsmParameter: mock(async () => {}),
        getCodebuildDeployment: mock(async () => ({ id: 'build-123' }))
      };

      const { startCodebuildDeployment } = await import('./codebuild');
      const result = await startCodebuildDeployment({
        awsSdkManager: mockAwsSdkManager,
        awsAccountId: '123456789012',
        invocationId: 'inv-123',
        systemId: 'sys-456',
        stacktapeUserInfo: { id: 'user-1', apiKey: 'key-123' },
        projectZipS3Key: 'project.zip',
        commandArgs: { stage: 'dev' } as any,
        projectName: 'myproject',
        codebuildPipeline: {
          bucketName: 'bucket',
          logGroupName: '/aws/log',
          codebuildProjectName: 'project',
          roleArn: 'arn:aws:iam::123:role/test'
        },
        gitInfo: {} as any
      });

      expect(result).toBeDefined();
      expect(mockAwsSdkManager.putSsmParameterValue).toHaveBeenCalled();
      expect(mockAwsSdkManager.startCodebuildDeployment).toHaveBeenCalled();
    });

    test('should cleanup SSM parameter after deployment', async () => {
      const mockAwsSdkManager: any = {
        region: 'us-east-1',
        putSsmParameterValue: mock(async () => {}),
        startCodebuildDeployment: mock(async () => ({
          id: 'build-123',
          arn: 'arn:aws:codebuild:us-east-1:123:build/test:build-123'
        })),
        waitForCodebuildDeploymentToReachBuildPhase: mock(async () => {}),
        deleteSsmParameter: mock(async () => {}),
        getCodebuildDeployment: mock(async () => ({ id: 'build-123' }))
      };

      const { startCodebuildDeployment } = await import('./codebuild');
      await startCodebuildDeployment({
        awsSdkManager: mockAwsSdkManager,
        awsAccountId: '123456789012',
        invocationId: 'inv-123',
        systemId: 'sys-456',
        stacktapeUserInfo: { id: 'user-1', apiKey: 'key-123' },
        projectZipS3Key: 'project.zip',
        commandArgs: { stage: 'dev' } as any,
        projectName: 'myproject',
        codebuildPipeline: {
          bucketName: 'bucket',
          logGroupName: '/aws/log',
          codebuildProjectName: 'project',
          roleArn: 'arn:aws:iam::123:role/test'
        },
        gitInfo: {} as any
      });

      expect(mockAwsSdkManager.deleteSsmParameter).toHaveBeenCalled();
    });
  });

  describe('getCodebuildLogStreamNameFromBuildInfo', () => {
    test('should extract log stream name from build info', async () => {
      const { getCodebuildLogStreamNameFromBuildInfo } = await import('./codebuild');

      const buildInfo: any = {
        logs: {
          cloudWatchLogs: {
            streamName: 'stream-name'
          }
        },
        arn: 'arn:aws:codebuild:us-east-1:123456789012:build/project:build-id'
      };

      const streamName = getCodebuildLogStreamNameFromBuildInfo({ buildInfo });

      expect(streamName).toContain('stream-name');
      expect(streamName).toContain('build-id');
    });
  });

  describe('getCodebuildLogGroupNameFromBuildInfo', () => {
    test('should extract log group name from build info', async () => {
      const { getCodebuildLogGroupNameFromBuildInfo } = await import('./codebuild');

      const buildInfo: any = {
        logs: {
          cloudWatchLogs: {
            groupName: '/aws/codebuild/project'
          }
        }
      };

      const groupName = getCodebuildLogGroupNameFromBuildInfo({ buildInfo });

      expect(groupName).toBe('/aws/codebuild/project');
    });
  });
});

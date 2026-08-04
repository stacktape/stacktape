import { describe, expect, test } from 'bun:test';
import type { Build } from '@aws-sdk/client-codebuild';
import type { AwsSdkManager } from '../../src/aws/sdk-manager';
import { startCodebuildDeployment } from '../../src/aws/codebuild-deployment';

const deploymentInput = {
  awsAccountId: '123456789012',
  invocationId: 'invocation-1',
  systemId: 'developer-machine',
  stacktapeUserInfo: { apiKey: 'secret-api-key', id: 'user-1' },
  stacktapeVersion: '4.0.0-dev.0',
  projectZipS3Key: 'projects/invocation-1.zip',
  commandArgs: { stage: 'dev' },
  projectName: 'project',
  codebuildPipeline: {
    bucketName: 'stacktape-artifacts',
    codebuildProjectName: 'stacktape-runner',
    logGroupName: '/stacktape/operations',
    roleArn: 'arn:aws:iam::123456789012:role/stacktape-codebuild'
  },
  gitInfo: {
    branch: 'feature',
    commit: 'abc123',
    gitUrl: 'https://github.com/stacktape/stacktape',
    hasUncommitedChanges: false,
    username: 'maintainer'
  }
} as const;

describe('CodeBuild deployment workflow', () => {
  test('hands off the API key, waits for the build phase, cleans up, and returns the refreshed build', async () => {
    const events: string[] = [];
    const startedBuild = { arn: 'arn:build/1', id: 'build-1' } as Build;
    const refreshedBuild = { ...startedBuild, buildStatus: 'IN_PROGRESS' } as Build;
    const awsSdkManager = {
      codeBuild: {
        getBuild: async ({ buildId }: { buildId: string }) => {
          events.push(`get:${buildId}`);
          return refreshedBuild;
        },
        startDeployment: async () => {
          events.push('start');
          return startedBuild;
        },
        waitForBuildPhase: async ({ buildId }: { buildId: string }) => {
          events.push(`wait:${buildId}`);
        }
      },
      parameterStore: {
        delete: async ({ name }: { name: string }) => {
          events.push(`delete:${name}`);
        },
        put: async ({ name }: { name: string }) => {
          events.push(`put:${name}`);
        }
      },
      region: 'eu-west-1'
    } as unknown as AwsSdkManager;

    await expect(startCodebuildDeployment({ ...deploymentInput, awsSdkManager })).resolves.toBe(refreshedBuild);
    expect(events).toEqual([
      'put:/stp/eu-west-1/user-1/invocation-1',
      'start',
      'wait:build-1',
      'delete:/stp/eu-west-1/user-1/invocation-1',
      'get:build-1'
    ]);
  });

  test('deletes the temporary API-key parameter when starting the build fails', async () => {
    const deletedParameters: string[] = [];
    const awsSdkManager = {
      codeBuild: {
        startDeployment: async () => {
          throw new Error('CodeBuild unavailable');
        }
      },
      parameterStore: {
        delete: async ({ name }: { name: string }) => {
          deletedParameters.push(name);
        },
        put: async () => undefined
      },
      region: 'eu-west-1'
    } as unknown as AwsSdkManager;

    await expect(startCodebuildDeployment({ ...deploymentInput, awsSdkManager })).rejects.toThrow(
      'CodeBuild unavailable'
    );
    expect(deletedParameters).toEqual(['/stp/eu-west-1/user-1/invocation-1']);
  });
});

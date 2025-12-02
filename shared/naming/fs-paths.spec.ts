import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { fsPaths } from './fs-paths';

describe('fs-paths', () => {
  const testInvocationId = 'test-invocation-123';
  const testJobName = 'my-job';
  const testStackName = 'my-stack';

  describe('absoluteTempFolderPath', () => {
    test('should generate temp folder path with invocation ID', () => {
      const path = fsPaths.absoluteTempFolderPath({ invocationId: testInvocationId });
      expect(path).toBe(join(process.cwd(), '.stacktape', testInvocationId));
    });

    test('should include .stacktape directory', () => {
      const path = fsPaths.absoluteTempFolderPath({ invocationId: testInvocationId });
      expect(path).toContain('.stacktape');
    });

    test('should differ for different invocation IDs', () => {
      const path1 = fsPaths.absoluteTempFolderPath({ invocationId: 'inv-1' });
      const path2 = fsPaths.absoluteTempFolderPath({ invocationId: 'inv-2' });
      expect(path1).not.toBe(path2);
    });
  });

  describe('absoluteBuildFolderPath', () => {
    test('should generate build folder path', () => {
      const path = fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId });
      expect(path).toBe(join(fsPaths.absoluteTempFolderPath({ invocationId: testInvocationId }), 'build'));
    });

    test('should be subdirectory of temp folder', () => {
      const tempPath = fsPaths.absoluteTempFolderPath({ invocationId: testInvocationId });
      const buildPath = fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId });
      expect(buildPath).toStartWith(tempPath);
    });

    test('should end with build directory', () => {
      const path = fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId });
      expect(path).toEndWith('build');
    });
  });

  describe('absoluteBinDepsInstallPath', () => {
    test('should generate binary dependencies install path', () => {
      const installationHash = 'hash123';
      const path = fsPaths.absoluteBinDepsInstallPath({
        invocationId: testInvocationId,
        installationHash
      });
      expect(path).toBe(
        join(
          fsPaths.absoluteTempFolderPath({ invocationId: testInvocationId }),
          'build',
          '_bin-install',
          installationHash
        )
      );
    });

    test('should include installation hash', () => {
      const hash = 'abc123def';
      const path = fsPaths.absoluteBinDepsInstallPath({
        invocationId: testInvocationId,
        installationHash: hash
      });
      expect(path).toContain(hash);
    });

    test('should be under build folder', () => {
      const buildPath = fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId });
      const installPath = fsPaths.absoluteBinDepsInstallPath({
        invocationId: testInvocationId,
        installationHash: 'hash'
      });
      expect(installPath).toStartWith(buildPath);
    });
  });

  describe('absoluteContainerArtifactFolderPath', () => {
    test('should generate container artifact folder path', () => {
      const path = fsPaths.absoluteContainerArtifactFolderPath({
        invocationId: testInvocationId,
        jobName: testJobName
      });
      expect(path).toBe(
        `${fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId })}/containers/${testJobName}`
      );
    });

    test('should include job name', () => {
      const path = fsPaths.absoluteContainerArtifactFolderPath({
        invocationId: testInvocationId,
        jobName: 'my-container'
      });
      expect(path).toContain('my-container');
    });

    test('should be in containers subdirectory', () => {
      const path = fsPaths.absoluteContainerArtifactFolderPath({
        invocationId: testInvocationId,
        jobName: testJobName
      });
      expect(path).toContain('/containers/');
    });
  });

  describe('absoluteLambdaArtifactFolderPath', () => {
    test('should generate lambda artifact folder path', () => {
      const path = fsPaths.absoluteLambdaArtifactFolderPath({
        invocationId: testInvocationId,
        jobName: testJobName
      });
      expect(path).toBe(
        `${fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId })}/lambdas/${testJobName}`
      );
    });

    test('should include job name', () => {
      const path = fsPaths.absoluteLambdaArtifactFolderPath({
        invocationId: testInvocationId,
        jobName: 'my-lambda'
      });
      expect(path).toContain('my-lambda');
    });

    test('should be in lambdas subdirectory', () => {
      const path = fsPaths.absoluteLambdaArtifactFolderPath({
        invocationId: testInvocationId,
        jobName: testJobName
      });
      expect(path).toContain('/lambdas/');
    });
  });

  describe('absoluteAwsCdkConstructArtifactFolderPath', () => {
    test('should generate AWS CDK construct artifact folder path', () => {
      const constructName = 'my-construct';
      const path = fsPaths.absoluteAwsCdkConstructArtifactFolderPath({
        invocationId: testInvocationId,
        constructName
      });
      expect(path).toBe(
        `${fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId })}/constructs/${constructName}`
      );
    });

    test('should include construct name', () => {
      const path = fsPaths.absoluteAwsCdkConstructArtifactFolderPath({
        invocationId: testInvocationId,
        constructName: 'vpc-construct'
      });
      expect(path).toContain('vpc-construct');
    });

    test('should be in constructs subdirectory', () => {
      const path = fsPaths.absoluteAwsCdkConstructArtifactFolderPath({
        invocationId: testInvocationId,
        constructName: 'construct'
      });
      expect(path).toContain('/constructs/');
    });
  });

  describe('absoluteNextjsBuiltProjectFolderPath', () => {
    test('should generate Next.js built project folder path', () => {
      const stpResourceName = 'my-nextjs-app';
      const path = fsPaths.absoluteNextjsBuiltProjectFolderPath({
        invocationId: testInvocationId,
        stpResourceName
      });
      expect(path).toBe(
        `${fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId })}/nextjs/${stpResourceName}`
      );
    });

    test('should include resource name', () => {
      const path = fsPaths.absoluteNextjsBuiltProjectFolderPath({
        invocationId: testInvocationId,
        stpResourceName: 'my-app'
      });
      expect(path).toContain('my-app');
    });

    test('should be in nextjs subdirectory', () => {
      const path = fsPaths.absoluteNextjsBuiltProjectFolderPath({
        invocationId: testInvocationId,
        stpResourceName: 'app'
      });
      expect(path).toContain('/nextjs/');
    });
  });

  describe('template file paths', () => {
    test('absoluteInitialCfTemplateFilePath should generate initial CF template path', () => {
      const path = fsPaths.absoluteInitialCfTemplateFilePath({ invocationId: testInvocationId });
      expect(path).toContain('.stacktape');
      expect(path).toContain(testInvocationId);
    });

    test('absoluteCfTemplateFilePath should generate CF template path', () => {
      const path = fsPaths.absoluteCfTemplateFilePath({ invocationId: testInvocationId });
      expect(path).toContain('.stacktape');
      expect(path).toContain(testInvocationId);
    });

    test('absoluteStpTemplateFilePath should generate STP template path', () => {
      const path = fsPaths.absoluteStpTemplateFilePath({ invocationId: testInvocationId });
      expect(path).toContain('.stacktape');
      expect(path).toContain(testInvocationId);
    });
  });

  describe('helperLambdasDir', () => {
    test('should return helper lambdas directory path', () => {
      const path = fsPaths.helperLambdasDir();
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });

    test('should return consistent path', () => {
      const path1 = fsPaths.helperLambdasDir();
      const path2 = fsPaths.helperLambdasDir();
      expect(path1).toBe(path2);
    });
  });

  describe('stackInfoDirectory', () => {
    test('should generate stack info directory with custom name', () => {
      const path = fsPaths.stackInfoDirectory({
        workingDir: '/path/to/project',
        directoryName: 'custom-stack-info'
      });
      expect(path).toBe(join('/path/to/project', 'custom-stack-info'));
    });

    test('should use default directory name when not provided', () => {
      const path = fsPaths.stackInfoDirectory({
        workingDir: '/path/to/project',
        directoryName: ''
      });
      expect(path).toBe(join('/path/to/project', '.stacktape-stack-info'));
    });

    test('should use default directory name for undefined', () => {
      const path = fsPaths.stackInfoDirectory({
        workingDir: '/path/to/project',
        directoryName: undefined as any
      });
      expect(path).toBe(join('/path/to/project', '.stacktape-stack-info'));
    });
  });

  describe('AWS credential paths', () => {});

  describe('stacktape data paths', () => {
    test('persistedStateFilePath should be in stacktape data folder', () => {
      const path = fsPaths.persistedStateFilePath();
      expect(path).toContain('.stacktape');
      expect(path).toContain('persisted-state.json');
    });

    test('stacktapeDataFolder should return .stacktape in home dir', () => {
      const path = fsPaths.stacktapeDataFolder();
      expect(path).toContain('.stacktape');
    });
  });

  describe('stackInfoCommandOutFile', () => {
    test('should generate stack info output file path with default name', () => {
      const path = fsPaths.stackInfoCommandOutFile({
        outputFileName: '',
        outputFormat: 'json'
      });
      expect(path).toBe(join(process.cwd(), 'stack-info.json'));
    });

    test('should use custom output file name', () => {
      const path = fsPaths.stackInfoCommandOutFile({
        outputFileName: 'custom-output.json',
        outputFormat: 'json'
      });
      expect(path).toBe(join(process.cwd(), 'custom-output.json'));
    });

    test('should respect output format for default name', () => {
      const jsonPath = fsPaths.stackInfoCommandOutFile({
        outputFileName: '',
        outputFormat: 'json'
      });
      const ymlPath = fsPaths.stackInfoCommandOutFile({
        outputFileName: '',
        outputFormat: 'yml'
      });
      expect(jsonPath).toContain('.json');
      expect(ymlPath).toContain('.yml');
    });
  });

  describe('pythonBridgeScriptPath', () => {
    test('should return Python bridge script path', () => {
      const path = fsPaths.pythonBridgeScriptPath();
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
      expect(path).toContain('python-bridge.py');
    });

    test('should return consistent path', () => {
      const path1 = fsPaths.pythonBridgeScriptPath();
      const path2 = fsPaths.pythonBridgeScriptPath();
      expect(path1).toBe(path2);
    });
  });

  describe('stackInfoPath', () => {
    test('should generate stack info path', () => {
      const path = fsPaths.stackInfoPath({
        dirPath: '/path/to/dir',
        stackName: testStackName
      });
      expect(path).toBe(join('/path/to/dir', `${testStackName}.json`));
    });

    test('should include stack name in filename', () => {
      const path = fsPaths.stackInfoPath({
        dirPath: '/dir',
        stackName: 'prod-stack'
      });
      expect(path).toContain('prod-stack.json');
    });

    test('should always have .json extension', () => {
      const path = fsPaths.stackInfoPath({
        dirPath: '/dir',
        stackName: 'stack'
      });
      expect(path).toEndWith('.json');
    });
  });

  describe('path relationships', () => {
    test('build folder should be under temp folder', () => {
      const tempPath = fsPaths.absoluteTempFolderPath({ invocationId: testInvocationId });
      const buildPath = fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId });
      expect(buildPath).toStartWith(tempPath);
    });

    test('artifact folders should be under build folder', () => {
      const buildPath = fsPaths.absoluteBuildFolderPath({ invocationId: testInvocationId });
      const containerPath = fsPaths.absoluteContainerArtifactFolderPath({
        invocationId: testInvocationId,
        jobName: 'job'
      });
      const lambdaPath = fsPaths.absoluteLambdaArtifactFolderPath({
        invocationId: testInvocationId,
        jobName: 'job'
      });
      expect(containerPath).toStartWith(buildPath);
      expect(lambdaPath).toStartWith(buildPath);
    });

    test('template files should be under temp folder', () => {
      const tempPath = fsPaths.absoluteTempFolderPath({ invocationId: testInvocationId });
      const cfPath = fsPaths.absoluteCfTemplateFilePath({ invocationId: testInvocationId });
      const stpPath = fsPaths.absoluteStpTemplateFilePath({ invocationId: testInvocationId });
      expect(cfPath).toStartWith(tempPath);
      expect(stpPath).toStartWith(tempPath);
    });
  });
});

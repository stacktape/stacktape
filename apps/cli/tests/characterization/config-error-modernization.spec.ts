import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeCliError } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { TemplateManager } from '@domain-services/template-manager';
import { getReturnableError, type CliError } from '@utils/errors';
import { getConfigPath, killPythonBridge, loadRawFileContent, parseUserCodeFilepath } from '@utils/file-loaders';
import { getUserCodeAsFn } from '@utils/user-code-processing';
import { validatePrimitiveFunctionParams } from '@utils/validation-utils';
import { fsPaths } from '../../src/config/runtime-paths';

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'stacktape-config-errors-'));
  temporaryDirectories.push(directory);
  return directory;
};

const expectCliError = (
  action: () => unknown,
  expected: { category: string; code: string; message?: string; hints?: string[] }
) => {
  try {
    action();
    throw new Error('Expected action to throw');
  } catch (error) {
    expect(error).toMatchObject(expected);
    expect(`${(error as Error).message}\n${((error as CliError).hints || []).join('\n')}`).not.toContain('\u001b[');
    return error as CliError;
  }
};

afterEach(() => {
  killPythonBridge();
  while (temporaryDirectories.length) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('modernized config and synthesis error contracts', () => {
  test('reports the resolved path when a referenced config file is unavailable', async () => {
    const workingDir = createTemporaryDirectory();
    const expectedPath = join(workingDir, 'missing.env');

    try {
      await loadRawFileContent({ workingDir, filePath: 'missing.env' });
      throw new Error('Expected loadRawFileContent to throw');
    } catch (error) {
      expect(error).toMatchObject({
        category: 'CONFIG',
        code: 'CONFIG_REFERENCED_FILE_UNAVAILABLE',
        message: 'File `./missing.env` does not exist or is not accessible.'
      });
      expect((error as Error).message).not.toContain(expectedPath);
      expect((error as Error).message).not.toContain('\\');
      expect((error as CliError).hints).toEqual([
        'Relative paths are resolved from `--currentWorkingDirectory` or the directory containing the Stacktape config.'
      ]);
    }
  });

  test('keeps source path and handler failures distinct', () => {
    const workingDir = createTemporaryDirectory();

    expectCliError(() => parseUserCodeFilepath({ fullPath: 'missing.ts:handler', codeType: 'DIRECTIVE', workingDir }), {
      category: 'CONFIG',
      code: 'CONFIG_SOURCE_FILE_UNAVAILABLE',
      message: 'DIRECTIVE source `./missing.ts` does not exist or is not accessible.'
    });

    const sourcePath = join(workingDir, 'directive.js');
    writeFileSync(sourcePath, 'module.exports = { value: 42 };');

    expectCliError(() => getUserCodeAsFn({ filePath: sourcePath, cache: false, codeType: 'DIRECTIVE', workingDir }), {
      category: 'SOURCE_CODE',
      code: 'SOURCE_CODE_HANDLER_MISSING',
      hints: ['To use another handler, configure the source as `<filePath>:<handler>`.']
    });
  });

  test('preserves the cause of a user-source execution failure', async () => {
    const workingDir = createTemporaryDirectory();
    const sourcePath = join(workingDir, 'failing-directive.js');
    writeFileSync(sourcePath, 'exports.run = async () => { throw new Error("failure from user source"); };');
    const directive = getUserCodeAsFn({
      filePath: `${sourcePath}:run`,
      cache: false,
      codeType: 'DIRECTIVE',
      workingDir
    });

    try {
      await directive();
      throw new Error('Expected directive to throw');
    } catch (error) {
      expect(error).toMatchObject({
        category: 'SOURCE_CODE',
        code: 'SOURCE_CODE_LOAD_FAILED'
      });
      expect((error as CliError).cause).toBeDefined();
      expect(String((error as CliError).cause)).toContain('failure from user source');
    }
  });

  test('reports an unavailable explicit config without exposing its absolute path', () => {
    const originalArgs = globalStateManager.rawArgs;
    globalStateManager.rawArgs = {
      configPath: '__missing-stacktape-config__.ts',
      currentWorkingDirectory: process.cwd()
    } as any;

    try {
      expectCliError(() => getConfigPath(), {
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_FILE_UNAVAILABLE',
        message: 'Config file `./__missing-stacktape-config__.ts` does not exist or is not accessible.'
      });
    } finally {
      globalStateManager.rawArgs = originalArgs;
    }
  });

  test('preserves a missing-Python CliError at the user-code loading boundary', () => {
    const workingDir = createTemporaryDirectory();
    const sourcePath = join(workingDir, 'directive.py');
    writeFileSync(sourcePath, 'def main():\n    return 1\n');
    const pathEnvironmentName = process.platform === 'win32' ? 'Path' : 'PATH';
    const originalPath = process.env[pathEnvironmentName];
    const originalPersistedState = globalStateManager.persistedState;
    killPythonBridge();
    process.env[pathEnvironmentName] = '';
    globalStateManager.persistedState = { otherDefaults: {} } as any;

    try {
      expectCliError(() => getUserCodeAsFn({ filePath: sourcePath, cache: false, codeType: 'DIRECTIVE', workingDir }), {
        category: 'MISSING_PREREQUISITE',
        code: 'PYTHON_EXECUTABLE_MISSING',
        message: 'Python executable is missing.'
      });
    } finally {
      if (originalPath === undefined) {
        delete process.env[pathEnvironmentName];
      } else {
        process.env[pathEnvironmentName] = originalPath;
      }
      globalStateManager.persistedState = originalPersistedState;
      killPythonBridge();
    }
  });

  test('preserves a Python execution CliError at the user-code invocation boundary', async () => {
    const workingDir = createTemporaryDirectory();
    const sourcePath = join(workingDir, 'directive.py');
    const bridgeDirectory = join(workingDir, 'bridge-files');
    mkdirSync(bridgeDirectory);
    writeFileSync(sourcePath, 'def main():\n    return 1\n');
    writeFileSync(
      join(bridgeDirectory, 'python-bridge.py'),
      "process.on('message', () => process.send?.({ type: 'exception', value: { error: 'synthetic failure' } }));"
    );
    const originalPersistedState = globalStateManager.persistedState;
    const originalExecutableDirname = fsPaths.absoluteExecutableDirname;
    killPythonBridge();
    fsPaths.absoluteExecutableDirname = () => workingDir;
    globalStateManager.persistedState = {
      otherDefaults: { executablePython: process.execPath }
    } as any;

    try {
      const directive = getUserCodeAsFn({ filePath: sourcePath, cache: false, codeType: 'DIRECTIVE', workingDir });
      try {
        await directive();
        throw new Error('Expected directive to throw');
      } catch (error) {
        expect(error).toMatchObject({
          category: 'SOURCE_CODE',
          code: 'PYTHON_DIRECTIVE_EXECUTION_FAILED'
        });
        expect((error as Error).message).toContain('Python directive in `./directive.py` failed:');
        expect((error as CliError).cause).toBeDefined();
      }
    } finally {
      globalStateManager.persistedState = originalPersistedState;
      killPythonBridge();
      fsPaths.absoluteExecutableDirname = originalExecutableDirname;
    }
  });

  test('distinguishes a missing directive parameter from an invalid type', () => {
    expectCliError(() => validatePrimitiveFunctionParams([], { secretName: 'string' }, 'Directive $Secret'), {
      category: 'PARAMETER',
      code: 'DIRECTIVE_PARAMETER_REQUIRED',
      message: 'Directive $Secret requires parameter `secretName` of type `string` at position 1.'
    });

    expectCliError(() => validatePrimitiveFunctionParams([42], { secretName: 'string' }, 'Directive $Secret'), {
      category: 'PARAMETER',
      code: 'DIRECTIVE_PARAMETER_TYPE_INVALID',
      message: 'Directive $Secret parameter `secretName` at position 1 must be of type `string`, but received `number`.'
    });
  });

  test('returns a semantic machine-readable code for oversized templates', () => {
    const manager = new TemplateManager();
    manager.template.Resources = Object.fromEntries(
      Array.from({ length: 501 }, (_, index) => [`Resource${index}`, { Type: 'AWS::S3::Bucket' }])
    );

    const error = expectCliError(() => manager.getTemplate(), {
      category: 'CLOUDFORMATION',
      code: 'CLOUDFORMATION_RESOURCE_LIMIT_EXCEEDED',
      message: 'CloudFormation templates cannot contain more than 500 resources. This template contains 501.'
    });

    const returned = getReturnableError(normalizeCliError(error)) as Error & {
      details: { code: string; errorType: string; hints: string[] };
    };
    expect(returned.details).toMatchObject({
      errorType: 'CLOUDFORMATION',
      code: 'CLOUDFORMATION_RESOURCE_LIMIT_EXCEEDED',
      hints: ['Split the infrastructure across multiple stacks or remove resources that are no longer needed.']
    });
  });
});

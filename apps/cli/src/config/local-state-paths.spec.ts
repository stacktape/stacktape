import { afterEach, describe, expect, test } from 'bun:test';
import { isAbsolute, join, relative, sep } from 'node:path';
import { localStatePaths } from './local-state-paths';

const originalProxyStateDirectory = process.env.STACKTAPE_DEV_PROXY_STATE_DIR;

afterEach(() => {
  if (originalProxyStateDirectory === undefined) {
    delete process.env.STACKTAPE_DEV_PROXY_STATE_DIR;
  } else {
    process.env.STACKTAPE_DEV_PROXY_STATE_DIR = originalProxyStateDirectory;
  }
});

const expectContainedBy = (parent: string, child: string) => {
  const pathFromParent = relative(parent, child);
  expect(isAbsolute(pathFromParent)).toBe(false);
  expect(pathFromParent).not.toBe('..');
  expect(pathFromParent.startsWith(`..${sep}`)).toBe(false);
};

describe('Stacktape-owned local state paths', () => {
  test('keeps persistent user state under one user data directory', () => {
    const userDataDirectory = localStatePaths.userDataDirectory();

    expectContainedBy(userDataDirectory, localStatePaths.persistedStateFile());
    expectContainedBy(userDataDirectory, localStatePaths.nativeInstallBinDirectory());
    delete process.env.STACKTAPE_DEV_PROXY_STATE_DIR;
    expectContainedBy(userDataDirectory, localStatePaths.devProxyDirectory());
  });

  test('keeps project state under .stacktape while preserving per-invocation and dev-resource isolation', () => {
    const workingDirectory = join(process.cwd(), 'example-project');
    const projectStateDirectory = localStatePaths.projectStateDirectory({ workingDirectory });

    expect(projectStateDirectory).toBe(join(workingDirectory, '.stacktape'));
    expectContainedBy(
      projectStateDirectory,
      localStatePaths.invocationDirectory({ commandWorkingDirectory: workingDirectory, invocationId: 'invocation-1' })
    );
    expectContainedBy(
      projectStateDirectory,
      localStatePaths.devResourceDataDirectory({ workingDirectory, stage: 'dev', resourceName: 'database' })
    );
    expectContainedBy(projectStateDirectory, localStatePaths.devAgentDirectory({ workingDirectory }));
    expectContainedBy(projectStateDirectory, localStatePaths.devAgentRegistryDirectory({ workingDirectory }));
  });

  test('retains explicit override and operation-temporary path contracts', () => {
    const workingDirectory = join(process.cwd(), 'example-project');
    const proxyOverride = join(process.cwd(), 'proxy-state');
    process.env.STACKTAPE_DEV_PROXY_STATE_DIR = proxyOverride;

    expect(localStatePaths.devProxyDirectory()).toBe(proxyOverride);
    expect(localStatePaths.downloadedTemplateFile({ workingDirectory, id: 'template-id' })).toBe(
      join(workingDirectory, '.stacktape-template-template-id.stp.ts')
    );
    expect(localStatePaths.starterArchiveFile({ targetDirectory: workingDirectory, id: 123 })).toBe(
      join(workingDirectory, '.stacktape-starter-123.zip')
    );
  });
});

import { describe, expect, mock, test } from 'bun:test';

// Mock dependencies
mock.module('read-pkg-up', () => ({
  default: mock(async () => ({ path: '/project/package.json' }))
}));

mock.module('@shared/packaging/bundlers/es/utils', () => ({
  getLockFileData: mock(async () => ({ packageManager: 'npm', lockfilePath: '/project/package-lock.json' }))
}));

mock.module('./bin-executable', () => ({
  checkExecutableInPath: mock(() => true)
}));

mock.module('./es-install-scripts', () => ({
  getEsInstallScript: mock(() => ['npm', 'install'])
}));

mock.module('./exec', () => ({
  exec: mock(async () => ({ stdout: '', stderr: '' }))
}));

mock.module('./monorepo', () => ({
  findProjectRoot: mock(async (path: string) => path.replace('/package.json', ''))
}));

mock.module('ci-info', () => ({
  default: { isCI: false }
}));

describe('dependency-installer', () => {
  test('should install dependencies', async () => {
    const { dependencyInstaller } = await import('./dependency-installer');
    const mockProgressLogger = {
      startEvent: mock(async () => {}),
      finishEvent: mock(async () => {})
    };

    await dependencyInstaller.install({
      rootProjectDirPath: '/project',
      progressLogger: mockProgressLogger as any
    });

    expect(mockProgressLogger.startEvent).toHaveBeenCalled();
    expect(mockProgressLogger.finishEvent).toHaveBeenCalled();
  });
});

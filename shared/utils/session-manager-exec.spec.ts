import { describe, expect, mock, test } from 'bun:test';

// Mock dependencies
mock.module('@config', () => ({
  IS_DEV: false
}));

mock.module('@shared/naming/project-fs-paths', () => ({
  SCRIPTS_ASSETS_PATH: '/assets'
}));

mock.module('./bin-executable', () => ({
  getPlatform: mock(() => 'linux')
}));

mock.module('./constants', () => ({
  SESSION_MANAGER_PLUGIN_BINARY_FILE_NAMES: {
    linux: 'smp-linux',
    darwin: 'smp-darwin',
    win: 'smp.exe'
  }
}));

describe('session-manager-exec', () => {
  describe('sessionManagerPath', () => {
    test('should export sessionManagerPath', async () => {
      const { sessionManagerPath } = await import('./session-manager-exec');

      expect(sessionManagerPath).toBeDefined();
      expect(typeof sessionManagerPath).toBe('string');
    });

    test('should construct path based on platform', async () => {
      const { sessionManagerPath } = await import('./session-manager-exec');

      expect(sessionManagerPath).toContain('session-manager-plugin');
    });

    test('should use smp executable name for linux', async () => {
      const { sessionManagerPath } = await import('./session-manager-exec');

      expect(sessionManagerPath).toContain('smp');
    });
  });
});

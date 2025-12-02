import { describe, expect, mock, test } from 'bun:test';
import { prettify, prettifyFile } from './prettier';

// Mock exec module
mock.module('./exec', () => ({
  exec: mock(async () => ({ stdout: '', stderr: '' }))
}));

describe('prettier', () => {
  describe('prettify', () => {
    test('should call exec with correct arguments for directory', async () => {
      const { exec } = await import('./exec');
      await prettify('src');

      expect(exec).toHaveBeenCalledWith('bunx', ['prettier', '--write', '--config', '.prettierrc', './src/**/*'], {
        disableStdout: true
      });
    });

    test('should handle different folder paths', async () => {
      const { exec } = await import('./exec');
      await prettify('shared/utils');

      expect(exec).toHaveBeenCalledWith(
        'bunx',
        ['prettier', '--write', '--config', '.prettierrc', './shared/utils/**/*'],
        { disableStdout: true }
      );
    });
  });

  describe('prettifyFile', () => {
    test('should call exec with correct arguments for single file', async () => {
      const { exec } = await import('./exec');
      await prettifyFile({ filePath: 'src/index.ts' });

      expect(exec).toHaveBeenCalledWith('bunx', ['prettier', '--write', '--config', '.prettierrc', 'src/index.ts'], {
        disableStdout: true
      });
    });

    test('should handle absolute file paths', async () => {
      const { exec } = await import('./exec');
      await prettifyFile({ filePath: '/home/user/project/file.ts' });

      expect(exec).toHaveBeenCalledWith(
        'bunx',
        ['prettier', '--write', '--config', '.prettierrc', '/home/user/project/file.ts'],
        { disableStdout: true }
      );
    });

    test('should work with different file extensions', async () => {
      const { exec } = await import('./exec');
      await prettifyFile({ filePath: 'config.json' });

      expect(exec).toHaveBeenCalledWith('bunx', ['prettier', '--write', '--config', '.prettierrc', 'config.json'], {
        disableStdout: true
      });
    });
  });
});

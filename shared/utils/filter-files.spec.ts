import { describe, expect, mock, test } from 'bun:test';

// Mock fs-extra
const mockFiles = {
  '/test/file1.ts': false,
  '/test/file2.js': false,
  '/test/subdir': true,
  '/test/subdir/file3.ts': false
};

mock.module('fs-extra', () => ({
  readdir: mock(async (dir: string) => {
    if (dir === '/test') {
      return ['file1.ts', 'file2.js', 'subdir'];
    }
    if (dir === '/test/subdir') {
      return ['file3.ts'];
    }
    return [];
  }),
  stat: mock(async (path: string) => ({
    isDirectory: () => mockFiles[path] === true
  })),
  remove: mock(async () => {})
}));

describe('filter-files', () => {
  describe('removeAllFilesWithExts', () => {
    test('should not remove files with other extensions', async () => {
      const { removeAllFilesWithExts } = await import('./filter-files');
      const { remove } = await import('fs-extra');

      await removeAllFilesWithExts({
        directory: '/test',
        exts: ['.ts']
      });

      // Should not remove .js file
      // @ts-expect-error - just ignore
      const calls = remove.mock.calls.map((call) => call[0]);
      expect(calls).not.toContain('/test/file2.js');
    });
  });
});

import { Buffer } from 'node:buffer';
import { describe, expect, mock, test } from 'bun:test';

// Mock fs/promises
mock.module('node:fs/promises', () => ({
  readFile: mock(async () => Buffer.from('test file content'))
}));

// Mock github-api
mock.module('./github-api', () => ({
  GitHubApiError: class GitHubApiError extends Error {
    constructor(
      message: string,
      public statusCode?: number,
      public cause?: unknown
    ) {
      super(message);
      this.name = 'GitHubApiError';
    }
  },
  uploadReleaseAsset: mock(async () => ({ data: { id: 123, name: 'asset.zip' } }))
}));

describe('github-file-manipulation', () => {
  describe('uploadReleaseAsset', () => {
    test('should upload file as release asset', async () => {
      const { uploadReleaseAsset } = await import('./github-file-manipulation');
      const githubApi = await import('./github-api');

      const result = await uploadReleaseAsset({
        assetName: 'binary.zip',
        sourceFilePath: '/path/to/binary.zip',
        releaseId: 456
      });

      expect(githubApi.uploadReleaseAsset).toHaveBeenCalledWith({
        releaseId: 456,
        assetName: 'binary.zip',
        data: expect.any(Buffer)
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(123);
    });

    test('should read file and upload', async () => {
      const { uploadReleaseAsset } = await import('./github-file-manipulation');
      const fsPromises = await import('node:fs/promises');

      await uploadReleaseAsset({
        assetName: 'test.tar.gz',
        sourceFilePath: '/path/to/test.tar.gz',
        releaseId: 789
      });

      expect(fsPromises.readFile).toHaveBeenCalledWith('/path/to/test.tar.gz');
    });
  });
});

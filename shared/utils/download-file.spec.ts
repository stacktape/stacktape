import { describe, expect, mock, test } from 'bun:test';
import { downloadFile } from './download-file';

// Mock nodejs-file-downloader
class MockDownloader {
  constructor(public config: any) {}
  async download() {
    return {
      downloadStatus: 'COMPLETE' as const,
      filePath: `${this.config.directory}/${this.config.fileName || 'downloaded-file'}`
    };
  }
}

mock.module('nodejs-file-downloader', () => ({ default: MockDownloader }));

describe('download-file', () => {
  test('should download file with basic configuration', async () => {
    const result = await downloadFile({
      downloadTo: '/tmp/downloads',
      url: 'https://example.com/file.zip'
    });

    expect(result.downloadStatus).toBe('COMPLETE');
    expect(result.filePath).toContain('/tmp/downloads');
  });

  test('should download file with custom filename', async () => {
    const result = await downloadFile({
      downloadTo: '/tmp/downloads',
      url: 'https://example.com/archive.tar.gz',
      fileName: 'custom-name.tar.gz'
    });

    expect(result.downloadStatus).toBe('COMPLETE');
    expect(result.filePath).toBe('/tmp/downloads/custom-name.tar.gz');
  });

  test('should download file with custom headers', async () => {
    const result = await downloadFile({
      downloadTo: '/tmp/downloads',
      url: 'https://example.com/protected-file.pdf',
      fileName: 'document.pdf',
      headers: {
        Authorization: 'Bearer token123',
        'X-Custom-Header': 'value'
      }
    });

    expect(result.downloadStatus).toBe('COMPLETE');
    expect(result.filePath).toBe('/tmp/downloads/document.pdf');
  });

  test('should work without explicit filename', async () => {
    const result = await downloadFile({
      downloadTo: '/home/user/files',
      url: 'https://cdn.example.com/package.zip'
    });

    expect(result.downloadStatus).toBe('COMPLETE');
    expect(result.filePath).toContain('/home/user/files');
  });

  test('should handle different download directories', async () => {
    const result = await downloadFile({
      downloadTo: '/var/tmp',
      url: 'https://example.com/data.json',
      fileName: 'data.json'
    });

    expect(result.filePath).toBe('/var/tmp/data.json');
  });
});

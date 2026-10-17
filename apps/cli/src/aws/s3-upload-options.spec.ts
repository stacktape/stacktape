import { describe, expect, test } from 'bun:test';
import { isS3NativeUploadHeader } from './s3-upload-options';

describe('S3 upload options', () => {
  test('separates native PutObject inputs from custom metadata', () => {
    for (const header of ['cache-control', 'ContentDisposition', 'ContentEncoding', 'ContentLanguage', 'Expires']) {
      expect(isS3NativeUploadHeader(header)).toBe(true);
    }
    expect(isS3NativeUploadHeader('authorization')).toBe(false);
    expect(isS3NativeUploadHeader('x-stacktape-origin')).toBe(false);
  });
});

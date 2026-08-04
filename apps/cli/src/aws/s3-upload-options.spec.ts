import { describe, expect, test } from 'bun:test';
import { automaticUploadFilterPresets, isS3NativeUploadHeader } from './s3-upload-options';

describe('S3 upload options', () => {
  test('separates native PutObject inputs from custom metadata', () => {
    for (const header of ['cache-control', 'ContentDisposition', 'ContentEncoding', 'ContentLanguage', 'Expires']) {
      expect(isS3NativeUploadHeader(header)).toBe(true);
    }
    expect(isS3NativeUploadHeader('authorization')).toBe(false);
    expect(isS3NativeUploadHeader('x-stacktape-origin')).toBe(false);
  });

  test('keeps each framework preset and its distinct cache contract', () => {
    expect(Object.keys(automaticUploadFilterPresets).sort()).toEqual([
      'astro-static-website',
      'gatsby-static-website',
      'nuxt-static-website',
      'single-page-app',
      'static-website',
      'sveltekit-static-website'
    ]);
    expect(automaticUploadFilterPresets['gatsby-static-website']).toContainEqual({
      includePattern: 'static/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }]
    });
    expect(automaticUploadFilterPresets['static-website']).toEqual([
      {
        includePattern: '**/*',
        headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
      }
    ]);
  });
});

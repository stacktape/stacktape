import { describe, expect, test } from 'bun:test';
import { stacktapeCloudfrontHeaders } from './stacktape-cloudfront-headers';

describe('stacktape-cloudfront-headers', () => {
  test('all header functions should return X-Stp prefixed strings', () => {
    expect(stacktapeCloudfrontHeaders.setOriginResponseHeaders()).toBe('X-Stp-Origin-Response-Set-Headers');
    expect(stacktapeCloudfrontHeaders.spaHeader()).toBe('X-Stp-Origin-Request-SPA');
    expect(stacktapeCloudfrontHeaders.urlOptimization()).toBe('X-Stp-Origin-Request-Url-Normalization');
    expect(stacktapeCloudfrontHeaders.rewriteHostHeader()).toBe('X-Stp-Origin-Request-Rewrite-Host');
    expect(stacktapeCloudfrontHeaders.originType()).toBe('X-Stp-Origin-Request-Origin-Type');
  });

  test('all headers should start with X-Stp prefix', () => {
    const allHeaders = [
      stacktapeCloudfrontHeaders.setOriginResponseHeaders(),
      stacktapeCloudfrontHeaders.spaHeader(),
      stacktapeCloudfrontHeaders.urlOptimization(),
      stacktapeCloudfrontHeaders.rewriteHostHeader(),
      stacktapeCloudfrontHeaders.originType()
    ];

    allHeaders.forEach((header) => {
      expect(header).toMatch(/^X-Stp-/);
    });
  });

  test('header names should be consistent', () => {
    expect(stacktapeCloudfrontHeaders.spaHeader()).toBe(stacktapeCloudfrontHeaders.spaHeader());
    expect(stacktapeCloudfrontHeaders.originType()).toBe(stacktapeCloudfrontHeaders.originType());
  });
});

import { describe, expect, test } from 'bun:test';
import { certificateSubjectNameCoversDomain, normalizeDomainName } from './domains';

describe('normalizeDomainName', () => {
  test('normalizes case and trailing root dot', () => {
    expect(normalizeDomainName('API.Internal.Example.COM.')).toBe('api.internal.example.com');
  });
});

describe('certificateSubjectNameCoversDomain', () => {
  test('matches exact certificate subject names', () => {
    expect(certificateSubjectNameCoversDomain('api.internal.example.com', 'api.internal.example.com')).toBe(true);
    expect(certificateSubjectNameCoversDomain('api.example.com', 'api.internal.example.com')).toBe(false);
  });

  test('matches wildcard certificate subject names for one label only', () => {
    expect(certificateSubjectNameCoversDomain('*.example.com', 'api.example.com')).toBe(true);
    expect(certificateSubjectNameCoversDomain('*.example.com', 'api.internal.example.com')).toBe(false);
    expect(certificateSubjectNameCoversDomain('*.internal.example.com', 'api.internal.example.com')).toBe(true);
  });
});

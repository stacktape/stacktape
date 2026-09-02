import { describe, expect, test } from 'bun:test';
import { detectProviderFromUrl, parseGitUrl } from './git-detection';

describe('Git remote parsing', () => {
  test('supports HTTPS and SCP-style remotes for each hosted provider', () => {
    expect(parseGitUrl('https://github.com/acme/api.git')).toEqual({ owner: 'acme', repository: 'api' });
    expect(parseGitUrl('git@bitbucket.org:acme/api.git')).toEqual({ owner: 'acme', repository: 'api' });
    expect(detectProviderFromUrl('ssh://git@gitlab.com/acme/api.git')).toBe('gitlab');
  });

  test('preserves the full nested GitLab namespace', () => {
    expect(parseGitUrl('git@gitlab.com:acme/platform/payments/api.git')).toEqual({
      owner: 'acme/platform/payments',
      repository: 'api'
    });
  });

  test('rejects provider lookalikes and malformed owner paths', () => {
    expect(detectProviderFromUrl('https://gitlab.com.attacker.example/acme/api.git')).toBeNull();
    expect(detectProviderFromUrl('https://example.com/github.com/acme/api.git')).toBeNull();
    expect(parseGitUrl('https://bitbucket.org/acme/nested/api.git')).toEqual({ owner: null, repository: null });
  });
});

import { describe, expect, it } from 'bun:test';
import { sanitizeGitRemoteUrl } from './git';

describe('sanitizeGitRemoteUrl', () => {
  it('removes HTTP credentials, query parameters, and fragments', () => {
    expect(sanitizeGitRemoteUrl('https://user:secret@github.com/example/repo.git?token=secret#fragment')).toBe(
      'https://github.com/example/repo.git'
    );
  });

  it('normalizes scp-style remotes without copying the username', () => {
    expect(sanitizeGitRemoteUrl('git@github.com:example/repo.git')).toBe('https://github.com/example/repo.git');
  });

  it('removes credentials from ssh and custom git transports', () => {
    expect(sanitizeGitRemoteUrl('ssh://git:secret@github.com/example/repo.git')).toBe(
      'ssh://github.com/example/repo.git'
    );
    expect(sanitizeGitRemoteUrl('git+ssh://token@github.com/example/repo.git?key=secret#fragment')).toBe(
      'git+ssh://github.com/example/repo.git'
    );
  });

  it('fails closed for malformed credential-bearing URLs', () => {
    expect(sanitizeGitRemoteUrl('https://token@')).toBe('');
    expect(sanitizeGitRemoteUrl('not-a-url?access_token=secret')).toBe('');
  });

  it('leaves local remotes unchanged', () => {
    expect(sanitizeGitRemoteUrl('../local-repository')).toBe('../local-repository');
  });
});

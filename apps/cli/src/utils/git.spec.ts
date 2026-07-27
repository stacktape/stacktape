import { describe, expect, it } from 'bun:test';
import { sanitizeGitRemoteUrl } from './git';

describe('sanitizeGitRemoteUrl', () => {
  it('removes HTTP credentials, query parameters, and fragments', () => {
    expect(sanitizeGitRemoteUrl('https://user:secret@git.example.com/example/repo.git?token=secret#fragment')).toBe(
      'https://git.example.com/example/repo.git'
    );
  });

  it('normalizes scp-style remotes without copying the username', () => {
    expect(sanitizeGitRemoteUrl('git@git.example.com:example/repo.git')).toBe(
      'https://git.example.com/example/repo.git'
    );
  });

  it('removes credentials from ssh and custom git transports', () => {
    expect(sanitizeGitRemoteUrl('ssh://git:secret@git.example.com/example/repo.git')).toBe(
      'ssh://git.example.com/example/repo.git'
    );
    expect(sanitizeGitRemoteUrl('git+ssh://token@git.example.com/example/repo.git?key=secret#fragment')).toBe(
      'git+ssh://git.example.com/example/repo.git'
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

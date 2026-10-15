import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { detectGitInfo, detectProviderFromUrl, getPathInRepository, parseGitUrl } from './git-detection';

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

describe('config path for push deploys', () => {
  test('a config in a repository subdirectory keeps its path from the repository root', () => {
    // `.native` expands Windows 8.3 names (`RUNNER~1`), which Git never prints; `realpathSync` alone keeps them.
    const repositoryRoot = realpathSync.native(mkdtempSync(join(tmpdir(), 'stp-git-detection-')));
    try {
      execSync('git init --quiet && git remote add origin git@github.com:acme/shop.git', { cwd: repositoryRoot });
      const serviceDirectory = join(repositoryRoot, 'services', 'api');
      mkdirSync(serviceDirectory, { recursive: true });

      const gitInfo = detectGitInfo(serviceDirectory);
      expect(gitInfo).toMatchObject({
        provider: 'github',
        owner: 'acme',
        repository: 'shop',
        rootDirectory: repositoryRoot
      });
      expect(getPathInRepository(gitInfo.rootDirectory, join(serviceDirectory, 'stacktape.ts'))).toBe(
        'services/api/stacktape.ts'
      );
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  test('a config outside the repository or an unknown root sends no path', () => {
    expect(getPathInRepository('/work/shop', '/work/other/stacktape.ts')).toBeNull();
    expect(getPathInRepository(null, '/work/shop/stacktape.ts')).toBeNull();
    expect(getPathInRepository('/work/shop', null)).toBeNull();
  });
});

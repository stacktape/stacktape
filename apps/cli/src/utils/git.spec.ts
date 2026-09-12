import { describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getGitVariable, sanitizeGitRemoteUrl } from './git';
import { GitInfoManager } from './git-info-manager';

it('reads the selected repository outside the launching directory and detects staged and untracked changes', async () => {
  const first = await mkdtemp(join(tmpdir(), 'stacktape git first '));
  const second = await mkdtemp(join(tmpdir(), 'stacktape git second '));
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    for (const [cwd, branch] of [
      [first, 'feature/first'],
      [second, 'feature/second']
    ]) {
      git(cwd, 'init', '-b', branch);
      git(cwd, 'remote', 'add', 'origin', `https://github.com/fixture/${branch.slice(8)}`);
      await writeFile(join(cwd, 'README.md'), branch);
      git(cwd, 'add', 'README.md');
      git(cwd, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', branch);
    }
    const manager = new GitInfoManager();
    const a = await manager.getGitInfo(first);
    const b = await manager.getGitInfo(second);
    expect(a.branch).toBe('feature/first');
    expect(b.branch).toBe('feature/second');
    expect(a.commit).toBe(git(first, 'rev-parse', 'HEAD'));
    expect(b.commit).toBe(git(second, 'rev-parse', 'HEAD'));
    expect(a.commit).not.toBe(b.commit);
    expect(a.gitUrl).toBe('https://github.com/fixture/first');
    expect(await getGitVariable('repositoryRoot', second)).toBe(second);
    expect((await getGitVariable('message', second)).trim()).toBe('feature/second');
    expect(await getGitVariable('changes', second)).toBe('');
    await writeFile(join(second, 'README.md'), 'staged change');
    git(second, 'add', 'README.md');
    expect(await getGitVariable('changes', second)).toContain('README.md');
    git(second, 'reset', '--hard', 'HEAD');
    await writeFile(join(second, 'untracked.txt'), 'new file');
    expect(await getGitVariable('changes', second)).toContain('untracked.txt');
    expect(await getGitVariable('changes', first)).toBe('');
  } finally {
    await Promise.all([rm(first, { recursive: true, force: true }), rm(second, { recursive: true, force: true })]);
  }
});

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

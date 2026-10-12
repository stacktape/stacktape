import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { ensureCheckout } from './init-real-project-corpus';
import { runProcess } from './qualification/process';
import type { RealProjectCorpusCase } from './init-real-project-corpus-cases';

test('different repositories named demo keep independent pinned checkouts across repeated imports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-corpus-cache-'));
  const cache = join(root, 'cache');
  const git = async (cwd: string, args: string[]) => {
    const result = await runProcess({
      command: 'git',
      args,
      cwd,
      timeoutMs: 10_000,
      env: {
        PATH: process.env.PATH,
        HOME: root,
        GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1'
      }
    });
    if (result.exitCode !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  };
  const repository = async (owner: string): Promise<RealProjectCorpusCase> => {
    const path = join(root, owner, 'demo');
    await mkdir(path, { recursive: true });
    await git(path, ['init', '-q']);
    await writeFile(join(path, 'package.json'), JSON.stringify({ name: owner }));
    await git(path, ['add', 'package.json']);
    await git(path, ['-c', 'user.name=Corpus Fixture', '-c', 'user.email=corpus@example.test', 'commit', '-qm', owner]);
    return {
      id: owner,
      repository: path,
      commit: await git(path, ['rev-parse', 'HEAD']),
      source: 'real-application',
      exercises: ['cache-isolation'],
      expect: { resourceTypes: {}, serviceCount: 0, httpServiceCount: 0 }
    };
  };
  try {
    await mkdir(cache);
    const first = await repository('first-owner');
    const second = await repository('second-owner');
    const firstCheckout = await ensureCheckout(cache, first);
    const secondCheckout = await ensureCheckout(cache, second);
    expect(secondCheckout).not.toBe(firstCheckout);
    expect(JSON.parse(await readFile(join(firstCheckout, 'package.json'), 'utf8'))).toEqual({ name: 'first-owner' });
    expect(JSON.parse(await readFile(join(secondCheckout, 'package.json'), 'utf8'))).toEqual({ name: 'second-owner' });
    expect(await ensureCheckout(cache, first)).toBe(firstCheckout);
    expect(await ensureCheckout(cache, second)).toBe(secondCheckout);
    expect(await git(firstCheckout, ['rev-parse', 'HEAD'])).toBe(first.commit);
    expect(await git(secondCheckout, ['rev-parse', 'HEAD'])).toBe(second.commit);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

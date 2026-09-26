import { afterEach, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  claimOutputDirectory,
  combineSourceChecks,
  compareSourceIdentities,
  createSourceTracker,
  getSourceIdentity
} from './measurement-context';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const directories: string[] = [];

// Inside the CLI's ignored `.stacktape` directory, where the measurement tools keep their own files.
const createDirectory = async () => {
  const directory = join(CLI_ROOT, '.stacktape', `measurement-context-test-${randomUUID().slice(0, 8)}`);
  await mkdir(directory, { recursive: true });
  directories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const git = (cwd: string, ...args: string[]) => {
  const result = Bun.spawnSync(
    [
      'git',
      '-c',
      'user.name=Stacktape tests',
      '-c',
      'user.email=tests@example.invalid',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'core.hooksPath=/dev/null',
      ...args
    ],
    { cwd, stdout: 'pipe', stderr: 'pipe' }
  );
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
};

/** A small repository with one committed source file under `src`. */
const createRepository = async () => {
  const root = join(await createDirectory(), 'repository');
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src', 'app.ts'), 'export const app = 1;\n');
  git(root, 'init', '--quiet');
  git(root, 'add', '--all');
  git(root, 'commit', '--quiet', '--message', 'fixture');
  return root;
};

describe('measured source identity', () => {
  test('stays equal for unchanged source and changes with an untracked file’s bytes', async () => {
    const repoRoot = await createRepository();
    const tracker = createSourceTracker({ repoRoot, scopes: ['src'] });
    expect(tracker.before.available).toBe(true);
    expect(tracker.check()).toBe('unchanged');

    await writeFile(join(repoRoot, 'src', 'helper.ts'), 'export const helper = 1;\n');
    const withHelper = getSourceIdentity({ repoRoot, scopes: ['src'] });
    expect(compareSourceIdentities(tracker.before, withHelper)).toBe('changed');
    expect(tracker.check()).toBe('changed');
  });

  // Windows has no execute bit, and Git there ignores file modes, so executable intent exists only on POSIX.
  test.skipIf(process.platform === 'win32')('changes with an untracked file’s executable intent', async () => {
    const repoRoot = await createRepository();
    await writeFile(join(repoRoot, 'src', 'helper.ts'), 'export const helper = 1;\n');
    const withHelper = getSourceIdentity({ repoRoot, scopes: ['src'] });

    await chmod(join(repoRoot, 'src', 'helper.ts'), 0o755);
    const withExecutableHelper = getSourceIdentity({ repoRoot, scopes: ['src'] });
    expect(compareSourceIdentities(withHelper, withExecutableHelper)).toBe('changed');
  });

  test('records an untracked symlink by its target, even when the target does not exist', async () => {
    const repoRoot = await createRepository();
    await symlink('missing-target.ts', join(repoRoot, 'src', 'link.ts'));
    const dangling = getSourceIdentity({ repoRoot, scopes: ['src'] });
    expect(dangling.available).toBe(true);

    await rm(join(repoRoot, 'src', 'link.ts'));
    await symlink('app.ts', join(repoRoot, 'src', 'link.ts'));
    expect(compareSourceIdentities(dangling, getSourceIdentity({ repoRoot, scopes: ['src'] }))).toBe('changed');
  });

  test('ignores what a tool writes into its excluded output directory inside the scope', async () => {
    const repoRoot = await createRepository();
    const outputDirectory = join(repoRoot, 'src', 'measurement output');
    await mkdir(outputDirectory);
    const options = { repoRoot, scopes: ['src'], excludePaths: [outputDirectory] };
    const before = getSourceIdentity(options);

    await writeFile(join(outputDirectory, 'report.json'), '{}\n');

    expect(compareSourceIdentities(before, getSourceIdentity(options))).toBe('unchanged');
    expect(before.excluded).toEqual(['src/measurement output']);
    // Without the exclusion the same output would be taken for a source change.
    expect(
      compareSourceIdentities(
        getSourceIdentity({ repoRoot, scopes: ['src'] }),
        getSourceIdentity({ repoRoot, scopes: ['src'], excludePaths: [outputDirectory] })
      )
    ).toBe('changed');
  });

  test('is unavailable, never unchanged, when a Git query fails after HEAD resolved', async () => {
    const repoRoot = await createRepository();
    const before = getSourceIdentity({ repoRoot, scopes: ['src'] });
    await writeFile(join(repoRoot, '.git', 'index'), 'not an index');

    const after = getSourceIdentity({ repoRoot, scopes: ['src'] });

    expect(after).toMatchObject({ available: false, revision: null, changesSha256: null, changedPaths: [] });
    expect(after.reason).toContain('git status exited with 128');
    expect(compareSourceIdentities(before, after)).toBe('unavailable');
    expect(combineSourceChecks(['unchanged', 'unavailable'])).toBe('unavailable');
    expect(combineSourceChecks(['unavailable', 'changed'])).toBe('changed');
  });
});

describe('measurement output directory', () => {
  test('is created when missing and accepted when empty', async () => {
    const directory = await createDirectory();
    await claimOutputDirectory(join(directory, 'new'));
    await claimOutputDirectory(join(directory, 'new'));
    expect(await readdir(join(directory, 'new'))).toEqual([]);
  });

  test('is refused when it has content, which stays untouched', async () => {
    const directory = await createDirectory();
    await mkdir(join(directory, 'workspace'));
    await writeFile(join(directory, 'workspace', 'sentinel.txt'), 'keep me\n');

    await expect(claimOutputDirectory(directory)).rejects.toThrow('it is not empty');
    expect(existsSync(join(directory, 'workspace', 'sentinel.txt'))).toBe(true);
  });
});

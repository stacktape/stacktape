import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { QualificationCaseManifest } from './contracts';
import { acquireProject, calculateSourceFingerprint } from './project-source';
import { assertProcessSucceeded, runProcess } from './process';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true, maxRetries: 3 })));
});

const createRoot = async () => {
  const path = await mkdtemp(join(tmpdir(), 'stacktape-qualification-source-test-'));
  temporaryRoots.push(path);
  return path;
};

const git = async (cwd: string, ...args: string[]) => {
  const result = await runProcess({ command: 'git', args, cwd, timeoutMs: 30_000 });
  assertProcessSucceeded(result);
  return result.stdout.trim();
};

const entryFor = ({ id, repository, commit }: { id: string; repository: string; commit: string }) =>
  ({
    id,
    title: id,
    why: 'Qualification source acquisition test.',
    source: { kind: 'git', repository, commit, license: 'MIT' },
    origin: 'real-application',
    tags: ['source-test'],
    lanes: ['import', 'package']
  }) satisfies QualificationCaseManifest;

const createRepository = async () => {
  const repository = await createRoot();
  await git(repository, 'init');
  await git(repository, 'config', 'user.email', 'qualification@example.invalid');
  await git(repository, 'config', 'user.name', 'Qualification Test');
  await writeFile(join(repository, 'version.txt'), 'one\n', 'utf8');
  await git(repository, 'add', 'version.txt');
  await git(repository, 'commit', '-m', 'first');
  const firstCommit = await git(repository, 'rev-parse', 'HEAD');
  await writeFile(join(repository, 'version.txt'), 'two\n', 'utf8');
  await git(repository, 'commit', '-am', 'second');
  const secondCommit = await git(repository, 'rev-parse', 'HEAD');
  return { repository, repositoryUrl: pathToFileURL(repository).href, firstCommit, secondCommit };
};

describe('qualification project sources', () => {
  test('uses commit-specific immutable caches and quarantines contamination', async () => {
    const source = await createRepository();
    const cacheRoot = await createRoot();
    const workRoot = await createRoot();
    const firstEntry = entryFor({ id: 'first-commit', repository: source.repositoryUrl, commit: source.firstCommit });
    const secondEntry = entryFor({
      id: 'second-commit',
      repository: source.repositoryUrl,
      commit: source.secondCommit
    });

    const [first, second] = await Promise.all(
      [firstEntry, secondEntry].map((entry) =>
        acquireProject({ entry, manifestDirectory: source.repository, cacheRoot, workRoot })
      )
    );
    expect(await readFile(join(first.projectRoot, 'version.txt'), 'utf8')).toBe('one\n');
    expect(await readFile(join(second.projectRoot, 'version.txt'), 'utf8')).toBe('two\n');

    const cacheDirectories = await readdir(cacheRoot);
    expect(
      cacheDirectories.filter((name) => !name.includes('.partial-') && !name.includes('.quarantined-'))
    ).toHaveLength(2);
    const firstCache = cacheDirectories.find((name) => name.endsWith(source.firstCommit.slice(0, 12)));
    expect(firstCache).toBeDefined();
    if (firstCache === undefined) throw new Error('The first commit cache was not created.');
    await writeFile(join(cacheRoot, firstCache, 'poison.txt'), 'must not be copied', 'utf8');

    const reacquired = await acquireProject({
      entry: firstEntry,
      manifestDirectory: source.repository,
      cacheRoot,
      workRoot
    });
    expect(await Bun.file(join(reacquired.projectRoot, 'poison.txt')).exists()).toBeFalse();
    expect((await readdir(cacheRoot)).some((name) => name.includes('.quarantined-'))).toBeTrue();
  });

  test('changes the local-source fingerprint when project content changes', async () => {
    const manifestRoot = await createRoot();
    const projectRoot = join(manifestRoot, 'project');
    await mkdir(projectRoot);
    await Bun.write(join(projectRoot, 'package.json'), '{"name":"fixture"}\n');
    const entry: QualificationCaseManifest = {
      id: 'local-fixture',
      title: 'Local fixture',
      why: 'Proves local source fingerprints include project content.',
      source: { kind: 'local', path: 'project', license: 'Synthetic fixture' },
      origin: 'synthetic',
      tags: ['local-source'],
      lanes: ['import']
    };
    const before = await calculateSourceFingerprint({ entry, manifestDirectory: manifestRoot });
    await Bun.write(join(projectRoot, 'package.json'), '{"name":"changed"}\n');
    const after = await calculateSourceFingerprint({ entry, manifestDirectory: manifestRoot });
    expect(after).not.toBe(before);
  });
});

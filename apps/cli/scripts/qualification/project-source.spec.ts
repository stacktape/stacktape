import { afterEach, describe, expect, test } from 'bun:test';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { QualificationCaseManifest } from './contracts';
import { runImportQualification } from './import-contract';
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

  test('preserves exact commit metadata only when a Dockerfile executes git', async () => {
    const source = await createRepository();
    await writeFile(
      join(source.repository, 'Dockerfile'),
      'FROM alpine\nCOPY . /app\nWORKDIR /app\nRUN git rev-parse HEAD > /app/.git_sha\n',
      'utf8'
    );
    await git(source.repository, 'add', 'Dockerfile');
    await git(source.repository, 'commit', '-m', 'docker build reads commit');
    const dockerCommit = await git(source.repository, 'rev-parse', 'HEAD');
    const cacheRoot = await createRoot();
    const workRoot = await createRoot();

    const acquired = await acquireProject({
      entry: entryFor({ id: 'git-aware-image', repository: source.repositoryUrl, commit: dockerCommit }),
      manifestDirectory: source.repository,
      cacheRoot,
      workRoot
    });

    expect(await Bun.file(join(acquired.projectRoot, '.git', 'HEAD')).exists()).toBeTrue();
    expect(await git(acquired.projectRoot, 'rev-parse', 'HEAD')).toBe(dockerCommit);
  });

  test('does not copy repository history into an ordinary project', async () => {
    const source = await createRepository();
    const acquired = await acquireProject({
      entry: entryFor({ id: 'ordinary-image', repository: source.repositoryUrl, commit: source.secondCommit }),
      manifestDirectory: source.repository,
      cacheRoot: await createRoot(),
      workRoot: await createRoot()
    });

    expect(await Bun.file(join(acquired.projectRoot, '.git')).exists()).toBeFalse();
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

  test('makes the isolated project copy writable without changing the declared source', async () => {
    const manifestRoot = await createRoot();
    const sourceRoot = join(manifestRoot, 'read-only-project');
    await mkdir(sourceRoot);
    await writeFile(join(sourceRoot, 'package.json'), '{"name":"read-only-fixture"}\n');
    await chmod(join(sourceRoot, 'package.json'), 0o444);
    await chmod(sourceRoot, 0o555);
    const entry: QualificationCaseManifest = {
      id: 'read-only-fixture',
      title: 'Read-only fixture',
      why: 'The sandbox input stays read-only while the isolated build copy must be writable.',
      source: { kind: 'local', path: 'read-only-project', license: 'Synthetic fixture' },
      origin: 'synthetic',
      tags: ['local-source'],
      lanes: ['import']
    };
    const acquired = await acquireProject({
      entry,
      manifestDirectory: manifestRoot,
      cacheRoot: await createRoot(),
      workRoot: await createRoot()
    });
    await writeFile(join(acquired.projectRoot, 'stacktape.yml'), 'resources: {}\n');
    expect((await stat(acquired.projectRoot)).mode & 0o200).not.toBe(0);
    expect((await stat(sourceRoot)).mode & 0o200).toBe(0);
  });

  test('preserves relative root and nested symlinks verbatim without rewriting them to absolute paths', async () => {
    const manifestRoot = await createRoot();
    const sourceRoot = join(manifestRoot, 'symlink-project');
    await mkdir(join(sourceRoot, 'docker'), { recursive: true });
    await mkdir(join(sourceRoot, 'apps', 'nested'), { recursive: true });
    await writeFile(join(sourceRoot, 'docker', 'Dockerfile.debian'), 'FROM debian\n', 'utf8');
    await writeFile(join(sourceRoot, 'apps', 'nested', 'package.json'), '{"name":"nested"}\n', 'utf8');
    await writeFile(join(sourceRoot, '.env.template'), 'PORT=80\n', 'utf8');

    await symlink('docker/Dockerfile.debian', join(sourceRoot, 'Dockerfile'));
    await symlink('../../docker/Dockerfile.debian', join(sourceRoot, 'apps', 'nested', 'Dockerfile'));

    const entry: QualificationCaseManifest = {
      id: 'symlink-fixture',
      title: 'Symlink fixture',
      why: 'Proves copyProject preserves relative symlinks verbatim.',
      source: { kind: 'local', path: 'symlink-project', license: 'Synthetic fixture' },
      origin: 'synthetic',
      tags: ['local-source'],
      lanes: ['import']
    };

    const acquired = await acquireProject({
      entry,
      manifestDirectory: manifestRoot,
      cacheRoot: await createRoot(),
      workRoot: await createRoot()
    });

    const rootLink = (await readlink(join(acquired.projectRoot, 'Dockerfile'))).replaceAll('\\', '/');
    expect(rootLink).toBe('docker/Dockerfile.debian');

    const nestedLink = (await readlink(join(acquired.projectRoot, 'apps', 'nested', 'Dockerfile'))).replaceAll(
      '\\',
      '/'
    );
    expect(nestedLink).toBe('../../docker/Dockerfile.debian');

    expect((await lstat(join(acquired.projectRoot, '.env.template'))).isFile()).toBeTrue();
    expect((await lstat(join(acquired.projectRoot, 'apps', 'nested', 'package.json'))).isFile()).toBeTrue();
  });

  test('preserves outside and dangling symlinks verbatim without dereferencing or trusting outside contents', async () => {
    const manifestRoot = await createRoot();
    const sourceRoot = join(manifestRoot, 'dangling-project');
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(join(sourceRoot, 'package.json'), '{"name":"dangling"}\n', 'utf8');

    await symlink('missing-target.txt', join(sourceRoot, 'dangling.txt'));
    await symlink('../../outside.txt', join(sourceRoot, 'escaping.txt'));

    const entry: QualificationCaseManifest = {
      id: 'dangling-fixture',
      title: 'Dangling and outside symlinks',
      why: 'Preserves verbatim links without dereferencing or pulling outside contents in.',
      source: { kind: 'local', path: 'dangling-project', license: 'Synthetic fixture' },
      origin: 'synthetic',
      tags: ['local-source'],
      lanes: ['import']
    };

    const acquired = await acquireProject({
      entry,
      manifestDirectory: manifestRoot,
      cacheRoot: await createRoot(),
      workRoot: await createRoot()
    });

    const danglingLink = (await readlink(join(acquired.projectRoot, 'dangling.txt'))).replaceAll('\\', '/');
    expect(danglingLink).toBe('missing-target.txt');

    const escapingLink = (await readlink(join(acquired.projectRoot, 'escaping.txt'))).replaceAll('\\', '/');
    expect(escapingLink).toBe('../../outside.txt');

    expect((await lstat(join(acquired.projectRoot, 'escaping.txt'))).isSymbolicLink()).toBeTrue();
  });

  test('covers complete acquire -> import path for a relative Dockerfile symlink', async () => {
    const manifestRoot = await createRoot();
    const sourceRoot = join(manifestRoot, 'import-symlink-project');
    await mkdir(join(sourceRoot, 'docker'), { recursive: true });
    await writeFile(
      join(sourceRoot, 'docker', 'Dockerfile.debian'),
      'FROM node:24-slim\nWORKDIR /app\nCOPY . /app\nEXPOSE 8080\nSTOPSIGNAL SIGINT\nCMD ["node", "index.js"]\n',
      'utf8'
    );
    await writeFile(
      join(sourceRoot, 'package.json'),
      '{"name":"import-symlink-app","scripts":{"start":"node index.js"}}\n',
      'utf8'
    );
    await writeFile(join(sourceRoot, 'index.js'), 'console.log("hello");\n', 'utf8');
    await symlink('docker/Dockerfile.debian', join(sourceRoot, 'Dockerfile'));

    const entry: QualificationCaseManifest = {
      id: 'import-symlink-fixture',
      title: 'Import symlink fixture',
      why: 'Verifies the full acquire-to-import pipeline with a relative Dockerfile symlink.',
      source: { kind: 'local', path: 'import-symlink-project', license: 'Synthetic fixture' },
      origin: 'synthetic',
      tags: ['local-source'],
      lanes: ['import']
    };

    const acquired = await acquireProject({
      entry,
      manifestDirectory: manifestRoot,
      cacheRoot: await createRoot(),
      workRoot: await createRoot()
    });

    const rootLink = (await readlink(join(acquired.projectRoot, 'Dockerfile'))).replaceAll('\\', '/');
    expect(rootLink).toBe('docker/Dockerfile.debian');

    const importResult = await runImportQualification({ entry, projectRoot: acquired.projectRoot });
    expect(importResult.validConfig).toBeTrue();
    expect(importResult.failures).toHaveLength(0);
    expect(importResult.generatedConfig).toContain('dockerfilePath: docker/Dockerfile.debian');
  });
});

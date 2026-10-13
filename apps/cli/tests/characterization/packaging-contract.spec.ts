import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { ProgressReporter as ProgressLogger } from '@application-services/operation-manager';
import AdmZip from 'adm-zip';
import objectHash from 'object-hash';
import { getFileHash } from '@stacktape/packaging/fs/files';
import { createHash } from 'node:crypto';
import { buildUsingCustomArtifact } from '@stacktape/packaging/artifact/custom-artifact';
import { archiveItem } from '@utils/zip';

const createPackagingError = ({ message }: { message: string }) => new Error(message);

const tempDirs: string[] = [];

const createWorkspace = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-packaging-contract-'));
  tempDirs.push(root);
  const source = join(root, 'source');
  const output = join(root, 'output');
  await mkdir(source);
  await mkdir(output);
  await writeFile(join(source, 'index.js'), 'export const handler = () => "v1";\n');
  return { root, source, output };
};

const progressLogger = {
  startEvent: async () => {},
  finishEvent: async () => {},
  updateEvent: async () => {},
  get eventContext() {
    return {};
  }
} as ProgressLogger;

const packageDirectory = async ({
  source,
  output,
  existingDigests = []
}: {
  source: string;
  output: string;
  existingDigests?: string[];
}) =>
  buildUsingCustomArtifact({
    packagePath: source,
    name: 'characterizationFunction',
    cwd: dirname(source),
    distFolderPath: output,
    progressLogger,
    existingDigests,
    handler: 'index.handler',
    archiveItem,
    createPackagingError
  });

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('custom artifact packaging contract', () => {
  // Cold archive setup can exceed Bun's five-second default on Windows CI.
  test('produces a deployable zip and tracks every source file', async () => {
    const { source, output } = await createWorkspace();
    await writeFile(join(source, 'config.json'), '{"enabled":true}\n');

    const result = await packageDirectory({ source, output });

    expect(result.outcome).toBe('bundled');
    expect(result.artifactPath).toEndWith('.zip');
    expect(result.digest).toMatch(/^[a-f0-9]{40}$/);
    expect(result.sourceFiles?.map(({ path }) => path).sort()).toEqual(
      [join(source, 'config.json'), join(source, 'index.js')].sort()
    );
    expect(await Bun.file(result.artifactPath!).exists()).toBe(true);

    const zip = new AdmZip(result.artifactPath!);
    expect(
      zip
        .getEntries()
        .map(({ entryName }) => entryName)
        .sort()
    ).toEqual(['config.json', 'index.js']);
    expect(zip.getEntry('index.js')?.getData().toString('utf8')).toBe('export const handler = () => "v1";\n');
    expect(JSON.parse(zip.getEntry('config.json')?.getData().toString('utf8') ?? '')).toEqual({
      enabled: true
    });
  }, 15_000);

  test('uses content-based digests for cache hits and source changes', async () => {
    const { source, output } = await createWorkspace();
    const first = await packageDirectory({ source, output });
    const cached = await packageDirectory({
      source,
      output,
      existingDigests: [first.digest]
    });

    expect(cached.outcome).toBe('skipped');
    expect(cached.digest).toBe(first.digest);
    const relocated = await createWorkspace();
    await cp(source, relocated.source, { recursive: true });
    const moved = await packageDirectory({ ...relocated, existingDigests: [first.digest] });
    expect(moved.outcome).toBe('skipped');
    expect(moved.digest).toBe(first.digest);

    await writeFile(join(source, 'index.js'), 'export const handler = () => "v2";\n');
    const changed = await packageDirectory({
      source,
      output,
      existingDigests: [first.digest]
    });

    expect(changed.outcome).toBe('bundled');
    expect(changed.digest).not.toBe(first.digest);
    expect(new AdmZip(changed.artifactPath!).readAsText('index.js')).toContain('v2');
    await rm(join(source, 'index.js'));
    const removed = await packageDirectory({ source, output, existingDigests: [changed.digest] });
    expect(removed.outcome).toBe('bundled');
    expect(new AdmZip(removed.artifactPath!).getEntries()).toHaveLength(0);
  });

  test('reports a skipped cache hit with an explicit null size that survives serialization', async () => {
    const { source, output } = await createWorkspace();
    const first = await packageDirectory({ source, output });
    const cached = await packageDirectory({ source, output, existingDigests: [first.digest] });

    expect(cached.outcome).toBe('skipped');
    expect(cached.size).toBeNull();
    expect(JSON.parse(JSON.stringify(cached))).toHaveProperty('size', null);
  });

  test('reports and serializes the uncompressed size of an already zipped package', async () => {
    const { root, output } = await createWorkspace();
    const archive = new AdmZip();
    archive.addFile('index.js', Buffer.from('export const handler = () => "v1";\n'));
    const packagePath = join(root, 'prezipped.zip');
    archive.writeZip(packagePath);

    const result = await buildUsingCustomArtifact({
      packagePath,
      name: 'characterizationFunction',
      cwd: root,
      distFolderPath: output,
      progressLogger,
      existingDigests: [],
      handler: 'index.handler',
      archiveItem,
      createPackagingError
    });

    expect(result.outcome).toBe('bundled');
    expect(result.artifactPath).toBe(join(output, 'prezipped.zip'));
    expect(Object.hasOwn(result, 'size')).toBe(true);
    expect(result.size).toBe(0);
    expect(JSON.parse(JSON.stringify(result))).toHaveProperty('size', 0);
    const previousDigest = createHash('sha1')
      .update(await getFileHash(packagePath))
      .update(objectHash({ handler: 'index.handler' }))
      .digest('hex');
    expect(result.digest).toBe(previousDigest);
    await chmod(packagePath, 0o755);
    const cached = await buildUsingCustomArtifact({
      packagePath,
      name: 'characterizationFunction',
      cwd: root,
      distFolderPath: output,
      progressLogger,
      existingDigests: [previousDigest],
      handler: 'index.handler',
      archiveItem,
      createPackagingError
    });
    expect(cached.outcome).toBe('skipped');
  });

  test('invalidates a custom directory artifact when a packaged dependency changes', async () => {
    const { source, output } = await createWorkspace();
    const first = await packageDirectory({ source, output });

    await mkdir(join(source, 'node_modules'));
    await writeFile(join(source, 'node_modules', 'transient.js'), 'not application source\n');
    const second = await packageDirectory({
      source,
      output,
      existingDigests: [first.digest]
    });

    expect(second.outcome).toBe('bundled');
    expect(second.digest).not.toBe(first.digest);
    const dependency = join(source, 'node_modules', 'transient.js');
    await writeFile(dependency, 'changed dependency bytes');
    const third = await packageDirectory({ source, output, existingDigests: [second.digest] });
    expect(third.outcome).toBe('bundled');
    expect(new AdmZip(third.artifactPath!).readAsText('node_modules/transient.js')).toBe('changed dependency bytes');
  });
  test('rejects oversized prebuilt ZIP metadata before copying the package', async () => {
    const { root, output } = await createWorkspace();
    const archive = new AdmZip();
    archive.addFile('large.bin', Buffer.from('x'));
    const bytes = archive.toBuffer();
    const central = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    bytes.writeUInt32LE(251 * 1024 * 1024, central + 24);
    const packagePath = join(root, 'large.zip');
    await writeFile(packagePath, bytes);
    await expect(
      buildUsingCustomArtifact({
        packagePath,
        name: 'oversized',
        cwd: root,
        distFolderPath: output,
        progressLogger,
        existingDigests: [],
        handler: 'index.handler',
        archiveItem,
        createPackagingError
      })
    ).rejects.toThrow('251MB unzipped');
    expect(await Bun.file(join(output, 'large.zip')).exists()).toBe(false);
  });

  test.skipIf(process.platform === 'win32')(
    'packages mode changes and rejects escaping links before replacing the ZIP',
    async () => {
      const { root, source, output } = await createWorkspace();
      await writeFile(join(source, 'tool'), 'binary');
      await chmod(join(source, 'tool'), 0o644);
      const first = await packageDirectory({ source, output });
      await chmod(join(source, 'tool'), 0o755);
      const changed = await packageDirectory({ source, output, existingDigests: [first.digest] });
      expect(changed.outcome).toBe('bundled');
      expect(changed.digest).not.toBe(first.digest);
      expect((new AdmZip(changed.artifactPath!).getEntry('tool')!.attr >>> 16) & 0o777).toBe(0o755);
      // A non-ZIP single file uses a byte checksum, so executable layout must participate separately.
      const single = join(root, 'single-tool');
      await writeFile(single, 'binary');
      await chmod(single, 0o644);
      const singleFirst = await packageDirectory({ source: single, output });
      await chmod(single, 0o755);
      const singleChanged = await packageDirectory({ source: single, output, existingDigests: [singleFirst.digest] });
      expect(singleChanged.outcome).toBe('bundled');
      expect((new AdmZip(singleChanged.artifactPath!).getEntry('single-tool')!.attr >>> 16) & 0o777).toBe(0o755);
      await writeFile(join(root, 'outside.txt'), 'outside');
      await symlink('../outside.txt', join(source, 'escape'));
      const before = await Bun.file(changed.artifactPath!).bytes();
      await expect(packageDirectory({ source, output })).rejects.toThrow('outside the archived directory');
      expect(await Bun.file(changed.artifactPath!).bytes()).toEqual(before);
      await expect(packageDirectory({ source: join(root, 'missing'), output })).rejects.toThrow(
        'Custom Lambda package was not found'
      );
    }
  );
});

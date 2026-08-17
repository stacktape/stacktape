import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { ProgressLogger } from '@application-services/event-manager/types';
import AdmZip from 'adm-zip';
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
  });

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

    await writeFile(join(source, 'index.js'), 'export const handler = () => "v2";\n');
    const changed = await packageDirectory({
      source,
      output,
      existingDigests: [first.digest]
    });

    expect(changed.outcome).toBe('bundled');
    expect(changed.digest).not.toBe(first.digest);
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
  });
});

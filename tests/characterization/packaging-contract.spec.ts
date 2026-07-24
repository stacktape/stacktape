import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import AdmZip from 'adm-zip';
import { buildUsingCustomArtifact } from '../../shared/packaging/custom-artifact';

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
    handler: 'index.handler'
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

  test('does not invalidate a package for excluded dependency/cache directories', async () => {
    const { source, output } = await createWorkspace();
    const first = await packageDirectory({ source, output });

    await mkdir(join(source, 'node_modules'));
    await writeFile(join(source, 'node_modules', 'transient.js'), 'not application source\n');
    const second = await packageDirectory({
      source,
      output,
      existingDigests: [first.digest]
    });

    expect(second.outcome).toBe('skipped');
    expect(second.digest).toBe(first.digest);
  });
});

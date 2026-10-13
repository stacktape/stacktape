import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Timing is decided when `utils/timings.ts` loads, so each case runs the wrapper in its own process.
let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-timed-archive-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const archiveInProcess = async (name: string, timingsFile?: string) => {
  const source = join(root, name, 'function');
  await mkdir(source, { recursive: true });
  await writeFile(join(source, 'index.js'), 'export const handler = () => 1;\n');
  const script = `const { archiveItem } = await import(${JSON.stringify(join(import.meta.dir, 'timed-archive.ts'))});
const first = await archiveItem({ absoluteSourcePath: ${JSON.stringify(source)}, format: 'zip', useNativeZip: true });
const second = await archiveItem({ absoluteSourcePath: ${JSON.stringify(source)}, absoluteDestDirPath: ${JSON.stringify(join(root, name, 'again'))}, format: 'zip', useNativeZip: true });
console.log(JSON.stringify([first, second]));`;
  const result = Bun.spawnSync({
    cmd: [process.execPath, '-e', script],
    cwd: join(root, name),
    env: { PATH: process.env.PATH ?? '', HOME: root, ...(timingsFile && { STP_TIMINGS_FILE: timingsFile }) },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 60_000
  });
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString(), source };
};

describe('timed archiveItem', () => {
  test('creates only the requested archives when timing is not enabled', async () => {
    const { exitCode, stdout, stderr, source } = await archiveInProcess('inactive');
    expect(exitCode, stderr).toBe(0);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toEqual([`${source}.zip`, join(root, 'inactive', 'again', 'function.zip')]);
    expect((await readdir(join(root, 'inactive'))).toSorted()).toEqual(['again', 'function', 'function.zip']);
    expect(await readdir(join(root, 'inactive', 'again'))).toEqual(['function.zip']);
  }, 15_000);

  test('records detection once and each archive with its backend when timing is on', async () => {
    const timingsFile = join(root, 'active-timings.json');
    const { exitCode, stdout, stderr } = await archiveInProcess('active', timingsFile);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toHaveLength(2);
    const { spans } = JSON.parse(await readFile(timingsFile, 'utf8'));
    const names = spans.map(({ name }: { name: string }) => name);
    expect(names).toEqual(['zip:detect-native-tool', 'zip:archive', 'zip:archive']);
    const [detection, ...archives] = spans;
    expect(['zip', '7z', 'archiver']).toContain(detection.detail.tool);
    for (const archive of archives) {
      expect(archive.end).not.toBeNull();
      expect(archive.detail).toMatchObject({ format: 'zip', directory: true, native: true });
      expect(['zip', '7z', 'archiver']).toContain(archive.detail.backend);
    }
  });
});

import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pnpmPack } from './pnpm-pack';

const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })));
});

describe('pnpm package artifact', () => {
  test('packs safely when paths contain Windows shell metacharacters', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'stacktape-pnpm-pack-&-'));
    fixtures.push(fixture);
    const packageDir = join(fixture, 'package');
    const destination = join(fixture, 'packed%PATH%&safe');
    await mkdir(packageDir);
    await mkdir(destination);
    await writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify({ name: 'stacktape-pack-probe', version: '1.0.0', files: ['index.js'] })
    );
    await writeFile(join(packageDir, 'index.js'), 'module.exports = true;');

    const result = await pnpmPack({ packageDir, destination });

    expect(existsSync(result.filename)).toBe(true);
    expect(result.files.map(({ path }) => path)).toEqual(['index.js', 'package.json']);
  });
});

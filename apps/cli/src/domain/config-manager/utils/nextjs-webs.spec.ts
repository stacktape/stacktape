import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isNextjsProjectDirectory } from './nextjs-webs';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const projectDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-nextjs-validation-'));
  directories.push(directory);
  return directory;
};

describe('Next.js project validation', () => {
  test('accepts a normal Next.js project with no optional next.config file', async () => {
    const directory = await projectDirectory();
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ dependencies: { next: '15.5.0', react: '19.0.0' } }),
      'utf8'
    );
    await mkdir(join(directory, 'app'));
    expect(isNextjsProjectDirectory(directory)).toBeTrue();
  });

  test('accepts every Next.js config extension supported by packaging', async () => {
    for (const fileName of ['next.config.ts', 'next.config.js', 'next.config.mjs', 'next.config.cjs']) {
      const directory = await projectDirectory();
      await writeFile(join(directory, fileName), 'export default {};\n', 'utf8');
      expect(isNextjsProjectDirectory(directory)).toBeTrue();
    }
  });

  test('rejects an unrelated package', async () => {
    const directory = await projectDirectory();
    await writeFile(join(directory, 'package.json'), JSON.stringify({ dependencies: { express: '5.0.0' } }), 'utf8');
    expect(isNextjsProjectDirectory(directory)).toBeFalse();
  });
});

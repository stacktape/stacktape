import { expect, test } from 'bun:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStarterProjectMetadata } from '../../scripts/starter-projects/utils';
import { adjustPackageJson } from '../../src/commands/init/using-starter-project/utils';

// Both published starter preparation and downloaded-starter init call this manifest transformation.
// Without the overrides, the fresh TanStack starter installs an incompatible router-generator and vinxi cannot build.
test('TanStack init preserves the authored dependency overrides needed by its build', async () => {
  const source = join(import.meta.dir, '../../starter-projects/tanstack-start-serverless');
  const project = await mkdtemp(join(tmpdir(), 'stacktape-tanstack-init-'));
  try {
    const manifestPath = join(project, 'package.json');
    await cp(join(source, 'package.json'), manifestPath);
    const authored = JSON.parse(await readFile(manifestPath, 'utf8')) as { overrides: Record<string, string> };
    expect(authored.overrides['@tanstack/router-generator']).toBe('1.120.20');
    const metadata = await getStarterProjectMetadata({ absoluteProjectPath: source });

    await adjustPackageJson({ absoluteProjectPath: project, metadata });

    const materialized = JSON.parse(await readFile(manifestPath, 'utf8')) as { overrides?: Record<string, string> };
    expect(materialized.overrides).toEqual(authored.overrides);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

// Package managers use different manifest fields for the same dependency-resolution promise.
test('starter init preserves nested npm overrides, pnpm configuration and Yarn resolutions', async () => {
  const project = await mkdtemp(join(tmpdir(), 'stacktape-starter-resolution-'));
  try {
    const authored = {
      overrides: { parent: { child: '2.0.0' } },
      pnpm: { overrides: { 'parent>child': '2.0.0' }, onlyBuiltDependencies: ['sharp'] },
      resolutions: { 'parent/child': '2.0.0' }
    };
    const manifestPath = join(project, 'package.json');
    await writeFile(manifestPath, JSON.stringify(authored));
    const metadata = await getStarterProjectMetadata({
      absoluteProjectPath: join(import.meta.dir, '../../starter-projects/tanstack-start-serverless')
    });

    await adjustPackageJson({ absoluteProjectPath: project, metadata });

    const materialized = JSON.parse(await readFile(manifestPath, 'utf8'));
    expect(materialized).toMatchObject(authored);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
});

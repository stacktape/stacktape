import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getLockFileData } from './utils';

const roots: string[] = [];
const project = async (files: Record<string, string>) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-lockfile-data-'));
  roots.push(root);
  await Promise.all(Object.entries(files).map(([name, contents]) => writeFile(join(root, name), contents)));
  return root;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/**
 * A project without a lockfile is installed by the package manager it declares, not by npm: a pnpm workspace
 * installed with npm gets no `workspace:` links, and the bundle of a package that imports its sibling fails.
 */
describe('getLockFileData', () => {
  test('a lockfile names the package manager', async () => {
    const root = await project({ 'package.json': '{}', 'pnpm-lock.yaml': 'lockfileVersion: 9\n' });
    expect(await getLockFileData(root)).toEqual({ lockfilePath: join(root, 'pnpm-lock.yaml'), packageManager: 'pnpm' });
  });

  test('a pnpm workspace without a lockfile is a pnpm project', async () => {
    const root = await project({ 'package.json': '{}', 'pnpm-workspace.yaml': 'packages:\n  - packages/*\n' });
    expect(await getLockFileData(root)).toEqual({ lockfilePath: null, packageManager: 'pnpm' });
  });

  test('the packageManager field names the manager without a lockfile', async () => {
    const root = await project({ 'package.json': JSON.stringify({ packageManager: 'yarn@4.5.0' }) });
    expect(await getLockFileData(root)).toEqual({ lockfilePath: null, packageManager: 'yarn' });
  });

  test('a project declaring nothing leaves the choice to the installer', async () => {
    const root = await project({ 'package.json': JSON.stringify({ packageManager: 'corepack@1.0.0' }) });
    expect(await getLockFileData(root)).toEqual({ lockfilePath: null, packageManager: null });
  });
});

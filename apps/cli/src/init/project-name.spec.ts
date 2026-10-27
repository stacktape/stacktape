import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { projectNameFor, toProjectName } from './project-name';

const roots: string[] = [];

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

const repository = async (files: Record<string, string>): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'stp-project-name-'));
  roots.push(root);
  await Promise.all(Object.entries(files).map(([path, contents]) => writeFile(join(root, path), contents, 'utf8')));
  return root;
};

describe('the name init gives a project', () => {
  it.each([
    ['r2p-files', 'r2p-files'],
    ['@acme/Shop_API', 'shop-api'],
    ['My App 2', 'my-app-2'],
    ['--', '']
  ])('reduces %p to %p', (name, expected) => {
    expect(toProjectName(name)).toBe(expected);
  });

  it('prefers package.json, then pyproject.toml, then the directory', async () => {
    expect(await projectNameFor(await repository({ 'package.json': '{ "name": "@acme/files" }' }))).toBe('files');
    expect(
      await projectNameFor(
        await repository({
          'pyproject.toml': '[build-system]\nname = "not-this"\n\n[project]\nname = "orders_api"\nversion = "1.0"\n'
        })
      )
    ).toBe('orders-api');
    expect(await projectNameFor(await repository({ 'pyproject.toml': '[tool.poetry]\nname = "billing"\n' }))).toBe(
      'billing'
    );
    // A manifest without a usable name falls back to the directory.
    const unnamed = await repository({ 'package.json': '{ "private": true }' });
    expect(await projectNameFor(unnamed)).toBe(toProjectName(unnamed.split('/').at(-1)!));
  });
});

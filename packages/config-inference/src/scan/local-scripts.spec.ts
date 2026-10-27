/**
 * Seed and migrate scripts from `package.json`, with the variables their own source reads.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import type { DependencyFact } from '../facts/dependency';
import { findLocalScripts } from './local-scripts';
import { readSourceFile } from './read-source';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-local-scripts-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await mkdir(join(directory, path, '..'), { recursive: true });
      await writeFile(join(directory, path), contents, 'utf8');
    })
  );
  return directory;
};

const database: DependencyFact = {
  name: 'mainDatabase',
  kind: 'postgres',
  extensions: [],
  consumedBy: [],
  addressedBy: [],
  evidence: [],
  source: 'probe'
};

describe('local scripts', () => {
  it('reads seed and migrate scripts, their runner and directory, and what their source reads', async () => {
    const files = {
      'package.json': JSON.stringify({ name: 'shop', scripts: { 'db:seed': 'tsx scripts/seed.ts', build: 'tsc' } }),
      'scripts/seed.ts': "import { url } from './db';\nconsole.log(url, process.env.SEED_COUNT);\n",
      'scripts/db.ts': 'export const url = process.env.DATABASE_URL;\n',
      'api/package.json': JSON.stringify({ name: 'api', scripts: { migrate: 'knex migrate:latest' } }),
      // Package directories of tests are not the project's.
      'e2e/package.json': JSON.stringify({ scripts: { seed: 'node fixtures.js' } })
    };
    root = await makeRepo(files);

    const scripts = await findLocalScripts({
      files: Object.keys(files),
      dependencies: [database],
      packageManager: 'pnpm',
      read: (path) => readSourceFile(root, path, { startLine: 1, endLine: Number.MAX_SAFE_INTEGER })
    });

    expect(
      scripts.map(({ name, command, directory, environmentVariables }) => ({
        name,
        command,
        directory,
        variables: environmentVariables.map((variable) => [variable.name, variable.dependencyName ?? variable.role])
      }))
    ).toEqual([
      {
        name: 'seed',
        command: 'pnpm run db:seed',
        directory: '.',
        // The entry file first, then what it imports.
        variables: [
          ['SEED_COUNT', 'runtime-config'],
          ['DATABASE_URL', 'mainDatabase']
        ]
      },
      // A tool's own command has no source here to read.
      { name: 'migrate', command: 'pnpm run migrate', directory: 'api', variables: [] }
    ]);
  });
});

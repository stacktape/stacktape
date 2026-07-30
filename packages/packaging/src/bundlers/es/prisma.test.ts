import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolvePrisma } from './utils';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('Prisma deployment artifacts', () => {
  test('keeps a query-compiler WASM file at its project-relative generated destination', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
    temporaryDirectories.push(projectRoot);
    const schemaDirectory = join(projectRoot, 'prisma');
    const generatedDirectory = join(projectRoot, 'generated', 'client');
    const distFolderPath = join(projectRoot, 'dist');
    await Promise.all([
      mkdir(schemaDirectory, { recursive: true }),
      mkdir(generatedDirectory, { recursive: true }),
      mkdir(distFolderPath, { recursive: true }),
      writeFile(join(projectRoot, 'package.json'), '{"name":"prisma-test"}')
    ]);
    await writeFile(
      join(schemaDirectory, 'schema.prisma'),
      `generator client {
  provider   = "prisma-client-js"
  engineType = "client"
  output     = "../generated/client"
}`
    );
    await writeFile(join(generatedDirectory, 'query_compiler_bg.wasm'), 'wasm');

    await resolvePrisma({
      createPackagingError: ({ message }) => new Error(message),
      distFolderPath,
      workingDir: projectRoot,
      workloadName: 'prismaFunction'
    });

    expect(await Bun.file(join(distFolderPath, 'generated', 'client', 'query_compiler_bg.wasm')).text()).toBe('wasm');
  });
});

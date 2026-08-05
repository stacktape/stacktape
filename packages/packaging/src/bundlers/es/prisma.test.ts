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

const writePrismaClientVersion = async (projectRoot: string, version: string) => {
  const packageDirectory = join(projectRoot, 'node_modules', '@prisma', 'client');
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(join(packageDirectory, 'package.json'), JSON.stringify({ name: '@prisma/client', version }));
};

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
    await Promise.all([
      writeFile(join(generatedDirectory, 'query_compiler_bg.wasm'), 'wasm'),
      writeFile(join(generatedDirectory, 'schema.prisma'), 'generated schema copy')
    ]);

    await resolvePrisma({
      createPackagingError: ({ message }) => new Error(message),
      distFolderPath,
      workingDir: projectRoot,
      workloadName: 'prismaFunction'
    });

    expect(await Bun.file(join(distFolderPath, 'generated', 'client', 'query_compiler_bg.wasm')).text()).toBe('wasm');
  });

  test('preserves the semantic packaging error when a generated query compiler is missing', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
    temporaryDirectories.push(projectRoot);
    const schemaDirectory = join(projectRoot, 'prisma');
    const distFolderPath = join(projectRoot, 'dist');
    await Promise.all([
      mkdir(schemaDirectory, { recursive: true }),
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
    const semanticError = Object.assign(new Error('semantic Prisma packaging failure'), { category: 'PACKAGING' });
    let detailsSeen: { message: string; cause?: unknown } | undefined;

    const error = await resolvePrisma({
      createPackagingError: (details) => {
        detailsSeen = details;
        return semanticError;
      },
      distFolderPath,
      workingDir: projectRoot,
      workloadName: 'prismaFunction'
    }).catch((caught: unknown) => caught);

    expect(error).toBe(semanticError);
    expect(detailsSeen?.message).toContain('query compiler');
    expect(detailsSeen?.cause).toBeInstanceOf(Error);
  });

  test('does not require a Rust engine for the Prisma 7 TypeScript client generator', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
    temporaryDirectories.push(projectRoot);
    const applicationRoot = join(projectRoot, 'apps', 'api');
    const schemaDirectory = join(applicationRoot, 'prisma');
    const generatedDirectory = join(applicationRoot, 'generated', 'client');
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
  provider = "prisma-client"
  output   = "../generated/client"
}`
    );
    await writeFile(join(generatedDirectory, 'client.ts'), 'export class PrismaClient {}');
    // pnpm commonly links a workspace dependency only beside the package that declares it, not at the monorepo root.
    await writePrismaClientVersion(applicationRoot, '7.3.0');

    await resolvePrisma({
      createPackagingError: ({ message }) => new Error(message),
      distFolderPath,
      workingDir: projectRoot,
      workloadName: 'prismaFunction'
    });

    expect(await Bun.file(join(generatedDirectory, 'client.ts')).text()).toContain('PrismaClient');
  });

  test('does not apply Prisma 7 engine defaults to a Prisma 6 client', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
    temporaryDirectories.push(projectRoot);
    const schemaDirectory = join(projectRoot, 'prisma');
    const distFolderPath = join(projectRoot, 'dist');
    await Promise.all([
      mkdir(schemaDirectory, { recursive: true }),
      mkdir(distFolderPath, { recursive: true }),
      writeFile(join(projectRoot, 'package.json'), '{"name":"prisma-test"}')
    ]);
    await writeFile(
      join(schemaDirectory, 'schema.prisma'),
      `generator client {
  provider = "prisma-client"
  output   = "../generated/client"
}`
    );
    await writePrismaClientVersion(projectRoot, '6.19.0');
    let detailsSeen: { message: string; hint?: string | undefined } | undefined;

    const error = await resolvePrisma({
      createPackagingError: (details) => {
        detailsSeen = details;
        return new Error(details.message);
      },
      distFolderPath,
      workingDir: projectRoot,
      workloadName: 'prismaFunction'
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(detailsSeen?.message).toContain('Prisma 6 requires an explicit engineType');
    expect(detailsSeen?.hint).toContain('engineType = "client"');
  });

  test.each(['library', 'binary'])(
    'fails clearly for an explicit legacy %s engine with prisma-client',
    async (engineType) => {
      const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
      temporaryDirectories.push(projectRoot);
      const schemaDirectory = join(projectRoot, 'prisma');
      const distFolderPath = join(projectRoot, 'dist');
      await Promise.all([
        mkdir(schemaDirectory, { recursive: true }),
        mkdir(distFolderPath, { recursive: true }),
        writeFile(join(projectRoot, 'package.json'), '{"name":"prisma-test"}')
      ]);
      await writeFile(
        join(schemaDirectory, 'schema.prisma'),
        `generator client {
  provider   = "prisma-client"
  output     = "../generated/client"
  engineType = "${engineType}"
}`
      );
      let detailsSeen: { message: string; hint?: string | undefined } | undefined;

      const error = await resolvePrisma({
        createPackagingError: (details) => {
          detailsSeen = details;
          return new Error(details.message);
        },
        distFolderPath,
        workingDir: projectRoot,
        workloadName: 'prismaFunction'
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect(detailsSeen?.message).toContain(`engineType "${engineType}" is not supported`);
      expect(detailsSeen?.hint).toContain('TypeScript query compiler');
    }
  );

  test('does not classify a schema as generated when its output resolves to the same directory', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
    temporaryDirectories.push(projectRoot);
    const schemaDirectory = join(projectRoot, 'prisma');
    const distFolderPath = join(projectRoot, 'dist');
    await Promise.all([
      mkdir(schemaDirectory, { recursive: true }),
      mkdir(distFolderPath, { recursive: true }),
      writeFile(join(projectRoot, 'package.json'), '{"name":"prisma-test"}')
    ]);
    const schemaPath = join(schemaDirectory, 'schema.prisma');
    await writeFile(
      schemaPath,
      `generator client {
  provider = "prisma-client"
  output   = "."
}`
    );
    await writePrismaClientVersion(projectRoot, '7.3.0');

    await resolvePrisma({
      createPackagingError: ({ message }) => new Error(message),
      distFolderPath,
      workingDir: projectRoot,
      workloadName: 'prismaFunction'
    });

    expect(await Bun.file(schemaPath).exists()).toBe(true);
  });

  test('ignores schemas under Stacktape build state', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
    temporaryDirectories.push(projectRoot);
    const schemaDirectory = join(projectRoot, 'prisma');
    const generatedDirectory = join(projectRoot, 'generated', 'client');
    const distFolderPath = join(projectRoot, 'dist');
    await Promise.all([
      mkdir(schemaDirectory, { recursive: true }),
      mkdir(generatedDirectory, { recursive: true }),
      mkdir(join(projectRoot, '.stacktape', 'copied'), { recursive: true }),
      mkdir(distFolderPath, { recursive: true }),
      writeFile(join(projectRoot, 'package.json'), '{"name":"prisma-test"}')
    ]);
    const schema = `generator client {
  provider   = "prisma-client-js"
  engineType = "client"
  output     = "../generated/client"
}`;
    await Promise.all([
      writeFile(join(schemaDirectory, 'schema.prisma'), schema),
      writeFile(join(projectRoot, '.stacktape', 'copied', 'schema.prisma'), schema),
      writeFile(join(generatedDirectory, 'query_compiler_bg.wasm'), 'wasm')
    ]);

    await resolvePrisma({
      createPackagingError: ({ message }) => new Error(message),
      distFolderPath,
      workingDir: projectRoot,
      workloadName: 'prismaFunction'
    });

    expect(await Bun.file(join(distFolderPath, 'generated', 'client', 'query_compiler_bg.wasm')).text()).toBe('wasm');
  });

  test('fails explicitly instead of selecting an arbitrary schema', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
    temporaryDirectories.push(projectRoot);
    const distFolderPath = join(projectRoot, 'dist');
    await Promise.all([
      mkdir(join(projectRoot, 'apps', 'alpha', 'prisma'), { recursive: true }),
      mkdir(join(projectRoot, 'apps', 'beta', 'prisma'), { recursive: true }),
      mkdir(distFolderPath, { recursive: true }),
      writeFile(join(projectRoot, 'package.json'), '{"name":"prisma-test"}')
    ]);
    await Promise.all([
      writeFile(join(projectRoot, 'apps', 'alpha', 'prisma', 'schema.prisma'), 'generator client {}'),
      writeFile(join(projectRoot, 'apps', 'beta', 'prisma', 'schema.prisma'), 'generator client {}')
    ]);
    let detailsSeen: { message: string } | undefined;

    const error = await resolvePrisma({
      createPackagingError: (details) => {
        detailsSeen = details;
        return new Error(details.message);
      },
      distFolderPath,
      workingDir: projectRoot,
      workloadName: 'prismaFunction'
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(detailsSeen?.message).toContain('apps/alpha/prisma/schema.prisma, apps/beta/prisma/schema.prisma');
  });

  test('selects the schema from the workload package in a monorepo', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'stacktape-prisma-package-'));
    temporaryDirectories.push(projectRoot);
    const applicationRoot = join(projectRoot, 'apps', 'alpha');
    const siblingRoot = join(projectRoot, 'apps', 'beta');
    const distFolderPath = join(projectRoot, 'dist');
    await Promise.all([
      mkdir(join(applicationRoot, 'prisma'), { recursive: true }),
      mkdir(join(siblingRoot, 'prisma'), { recursive: true }),
      mkdir(distFolderPath, { recursive: true })
    ]);
    await Promise.all([
      writeFile(join(projectRoot, 'package.json'), '{"name":"prisma-monorepo","private":true}'),
      writeFile(join(projectRoot, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n"),
      writeFile(join(applicationRoot, 'package.json'), '{"name":"alpha"}'),
      writeFile(join(siblingRoot, 'package.json'), '{"name":"beta"}')
    ]);
    await Promise.all([
      writeFile(
        join(applicationRoot, 'prisma', 'schema.prisma'),
        'generator client { provider = "prisma-client" output = "../generated" engineType = "client" }'
      ),
      writeFile(join(siblingRoot, 'prisma', 'schema.prisma'), 'generator client {}')
    ]);

    await expect(
      resolvePrisma({
        createPackagingError: ({ message }) => new Error(message),
        distFolderPath,
        workingDir: applicationRoot,
        workloadName: 'alphaApi'
      })
    ).resolves.toBeUndefined();
  });
});

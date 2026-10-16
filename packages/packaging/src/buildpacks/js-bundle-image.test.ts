/*
 * What the production `js-bundle` image buildpack installs beside the runtime, through the real bundle and Dockerfile
 * generation. Docker is replaced by a fake that keeps the generated Dockerfile.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import type { BuildDockerImage, PackagingProgressLogger } from '../runtime-contracts';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildJsBundleImage } from './js-bundle-image';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

const progressLogger: PackagingProgressLogger = {
  eventContext: {},
  startEvent: () => {},
  updateEvent: () => {},
  finishEvent: () => {}
};

const writeJson = async (path: string, value: unknown) => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, JSON.stringify(value));
};

/**
 * A project whose handler imports `db`, an installed package (from a private registry, say) that stays out of the
 * bundle. `db` depends on `dbDependency`, installed beside it as npm hoists it. A workspace package is not used: the
 * bundler bundles those, and sees their imports.
 */
const createProject = async (
  dbDependency: { name: string; version: string },
  { asOptionalPeer = false }: { asOptionalPeer?: boolean } = {}
) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-js-bundle-image-'));
  temporaryDirectories.push(root);
  await writeJson(join(root, 'package.json'), {
    name: 'app',
    private: true,
    dependencies: { db: '1.0.0', ...(asOptionalPeer && { [dbDependency.name]: dbDependency.version }) }
  });
  const installPackage = async (name: string, version: string, source: string, fields = {}) => {
    const directory = join(root, 'node_modules', ...name.split('/'));
    await writeJson(join(directory, 'package.json'), { name, version, main: 'index.js', ...fields });
    await writeFile(join(directory, 'index.js'), source);
  };
  await installPackage(
    'db',
    '1.0.0',
    `module.exports = { client: () => require(${JSON.stringify(dbDependency.name)}) };\n`,
    asOptionalPeer
      ? {
          peerDependencies: { [dbDependency.name]: dbDependency.version },
          peerDependenciesMeta: { [dbDependency.name]: { optional: true } }
        }
      : { dependencies: { [dbDependency.name]: dbDependency.version } }
  );
  await installPackage(dbDependency.name, dbDependency.version, 'module.exports = {};\n');
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src', 'index.ts'), "import { client } from 'db';\nconsole.log(client());\n");
  return root;
};

/** Builds the image of `root` and returns the stage of the Dockerfile Docker was given that the image runs. */
const buildRuntimeStage = async (root: string, { includeFiles }: { includeFiles?: string[] } = {}) => {
  let dockerfile: string | undefined;
  const buildDockerImage: BuildDockerImage = async ({ buildContextPath, dockerfilePath }) => {
    dockerfile = await readFile(join(buildContextPath, dockerfilePath ?? 'Dockerfile'), 'utf8');
    return { id: 'sha256:fake', size: 1, dockerOutput: '', duration: 0, created: Date.now() };
  };
  await buildJsBundleImage({
    name: 'api',
    cwd: root,
    entryfilePath: join(root, 'src', 'index.ts'),
    distFolderPath: join(root, '.stacktape', 'dist'),
    existingDigests: [],
    invocationId: 'test',
    progressLogger,
    minify: false,
    nodeTarget: '24',
    nodeVersion: 24,
    requiresGlibcBinaries: false,
    dependenciesToExcludeFromBundle: ['db'],
    nativeDependencyInstallationRootPath: join(root, '.stacktape', 'native'),
    installDependencies: async () => {},
    runDocker: async () => {
      throw new Error('Docker should not run for this bundle.');
    },
    buildDockerImage,
    checkDockerImageExists: async () => false,
    getDockerImageDetails: async () => {
      throw new Error('Not used outside dev mode.');
    },
    createPackagingError: ({ message, cause }) => new Error(message, cause === undefined ? undefined : { cause }),
    runtimeTools: { tini: false, curl: false },
    ...(includeFiles && { includeFiles })
  });
  if (dockerfile === undefined) throw new Error('The buildpack did not build an image.');
  return dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));
};

describe('js-bundle image runtime tools', () => {
  test('an Alpine image gets openssl when a package installed beside the bundle depends on Prisma', async () => {
    const root = await createProject({ name: '@prisma/client', version: '5.22.0' });

    expect(await buildRuntimeStage(root)).toContain('apk add --no-cache openssl');
  });

  test('an Alpine image gets openssl when the production install gives an installed package Prisma as an optional peer', async () => {
    // The function includes the project's manifest, so the image installs Prisma from it, and `db` loads it.
    const root = await createProject({ name: '@prisma/client', version: '5.22.0' }, { asOptionalPeer: true });

    expect(await buildRuntimeStage(root, { includeFiles: ['package.json'] })).toContain('apk add --no-cache openssl');
  });

  test('an Alpine image installs nothing beside the runtime when no installed package uses Prisma', async () => {
    const root = await createProject({ name: 'ms', version: '2.1.3' });

    expect(await buildRuntimeStage(root)).not.toContain('apk add');
  });
});

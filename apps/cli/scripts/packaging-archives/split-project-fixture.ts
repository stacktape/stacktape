/**
 * A Node.js project whose three functions the CLI packages in one split build, for the production cache scenario of the
 * Lambda archive acceptance. Every function imports one large shared module, which becomes a shared chunk layer.
 * `native` also imports a package with a native build, which goes to a native dependency layer and ships a tool with
 * an npm `.bin` link; `prisma` uses a Prisma client whose query engine the build copies into the function.
 *
 * Nothing here is installed from a registry. The native package's installed form is kept in `dockerInstall`, and a
 * stand-in `docker` executable returns it as the result of the dependency build Stacktape runs in Docker. That
 * stand-in answers only the commands the split path sends; any other command fails and is logged.
 */
import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const sha256 = (content: string | Buffer) => createHash('sha256').update(content).digest('hex');

/**
 * What the CLI records after installing a project's dependencies (its version 3 marker, `dependency-installer.ts`):
 * the lockfile, the manifest, and the direct dependencies present. With it the CLI does not install them again. A
 * marker the CLI no longer accepts makes it install, which fails loudly in these acceptances: no package manager is on
 * their PATH.
 */
export const writeInstallMarker = async (project: string) => {
  const manifest = await readFile(join(project, 'package.json'));
  const { dependencies = {} } = JSON.parse(manifest.toString('utf8')) as { dependencies?: Record<string, string> };
  const marker = {
    version: 3,
    lockfileSha256: sha256(await readFile(join(project, 'package-lock.json'))),
    inputsSha256: sha256(JSON.stringify({ manifestSha256: sha256(manifest), config: {} })),
    installedDirectDependencies: Object.keys(dependencies).toSorted()
  };
  await mkdir(join(project, 'node_modules'), { recursive: true });
  await writeFile(join(project, 'node_modules', '.stacktape-install-hash'), JSON.stringify(marker));
};

export const SPLIT_FUNCTIONS = ['native', 'prisma', 'plain'] as const;
export type SplitFunctionName = (typeof SPLIT_FUNCTIONS)[number];

export const NATIVE_TOOL = 'fixture-native/bin/native-tool.sh';
export const PRISMA_ENGINE = 'query-engine-rhel-openssl-3.0.x';

const file = async (path: string, contents: string, mode = 0o644) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  await chmod(path, mode);
};

/** Runs a file and reports its output, or the error code that stopped it. */
const RUN_HELPER = `import { execFileSync } from 'node:child_process';

const run = (path: string) => {
  try {
    return execFileSync(path).toString().trim();
  } catch (error) {
    return \`failed: \${(error as { code?: string }).code ?? (error as Error).message}\`;
  }
};
`;

/** More than the 1 KiB a shared chunk needs to become a layer, even minified. */
const CATALOG = Array.from(
  { length: 64 },
  (_, index) => `catalog entry ${String(index).padStart(3, '0')} shared by every split function`
);
/** What every function reports as `catalog`: proof that it loaded the shared module. */
export const SHARED_CATALOG_SIZE = CATALOG.join('').length;

const SHARED_MODULE = `export const CATALOG = ${JSON.stringify(CATALOG, null, 2)};

export const catalogSize = () => CATALOG.join('').length;
`;

const HANDLERS: Record<SplitFunctionName, string> = {
  native: `${RUN_HELPER}import fixtureNative from 'fixture-native';
import { catalogSize } from '../shared/catalog';

export const handler = async () => ({
  function: 'native',
  uid: process.getuid?.(),
  catalog: catalogSize(),
  packageName: fixtureNative.name,
  tool: run('/opt/nodejs/node_modules/.bin/native-tool')
});
`,
  prisma: `${RUN_HELPER}import { PrismaClient } from '@prisma/client';
import { catalogSize } from '../shared/catalog';

export const handler = async () => ({
  function: 'prisma',
  uid: process.getuid?.(),
  catalog: catalogSize(),
  client: new PrismaClient().engine,
  engine: run('/var/task/${PRISMA_ENGINE}')
});
`,
  plain: `import { catalogSize } from '../shared/catalog';

export const handler = async () => ({ function: 'plain', uid: process.getuid?.(), catalog: catalogSize() });
`
};

const PRISMA_SCHEMA = `generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
  engineType    = "binary"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

/** The native package as npm installs it: a build marker, an entry file, an executable tool and its `.bin` link. */
const writeNativePackage = async (nodeModules: string) => {
  await file(
    join(nodeModules, 'fixture-native', 'package.json'),
    `${JSON.stringify({ name: 'fixture-native', version: '1.0.0', main: 'index.js', gypfile: true, bin: { 'native-tool': 'bin/native-tool.sh' } })}\n`
  );
  await file(join(nodeModules, 'fixture-native', 'index.js'), "module.exports = { name: 'fixture-native' };\n");
  await file(join(nodeModules, NATIVE_TOOL), '#!/bin/sh\necho native-tool\n', 0o755);
  await mkdir(join(nodeModules, '.bin'), { recursive: true });
  await symlink('../fixture-native/bin/native-tool.sh', join(nodeModules, '.bin', 'native-tool'));
};

/**
 * The Docker CLI as the split path uses it: reachable, both build platforms installed, and a dependency build whose
 * local output is the installed native package. `cp -a` keeps the installed modes and links, as Docker's local
 * exporter does.
 */
const FAKE_DOCKER = `#!/bin/sh
PATH=/usr/bin:/bin
echo "$*" >> "$STP_FAKE_DOCKER_LOG"
case "$1 $2" in
  "info "*) exit 0 ;;
  "buildx inspect") printf 'Name: default\\nPlatforms: linux/amd64, linux/arm64\\n'; exit 0 ;;
  "image build")
    for argument in "$@"; do
      case "$argument" in type=local,dest=*) destination="\${argument#type=local,dest=}" ;; esac
    done
    if [ -n "$destination" ]; then
      mkdir -p "$destination" && cp -a "$STP_FAKE_DOCKER_INSTALL/node_modules" "$destination/"
      exit $?
    fi ;;
esac
echo "The acceptance's docker stand-in does not support: docker $*" >&2
exit 1
`;

export type SplitProjectFixture = {
  root: string;
  project: string;
  /** The native package as the Docker dependency build returns it; change modes here to change the layer. */
  dockerInstall: string;
  /** A directory holding only the stand-in `docker`. */
  dockerDirectory: string;
  prismaEngine: string;
};

export const writeSplitProjectFixture = async (root: string): Promise<SplitProjectFixture> => {
  const project = join(root, 'project');
  const nodeModules = join(project, 'node_modules');
  await file(
    join(project, 'package.json'),
    `${JSON.stringify(
      {
        name: 'split-fixture',
        version: '1.0.0',
        private: true,
        type: 'module',
        // Makes this directory its own project root, as a standalone project is.
        workspaces: [],
        dependencies: { '@prisma/client': '5.22.0', 'fixture-native': '1.0.0' }
      },
      null,
      2
    )}\n`
  );
  await file(
    join(project, 'package-lock.json'),
    `${JSON.stringify(
      {
        name: 'split-fixture',
        version: '1.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: 'split-fixture',
            version: '1.0.0',
            dependencies: { '@prisma/client': '5.22.0', 'fixture-native': '1.0.0' }
          },
          'node_modules/@prisma/client': { version: '5.22.0' },
          'node_modules/fixture-native': { version: '1.0.0', hasInstallScript: true }
        }
      },
      null,
      2
    )}\n`
  );
  await file(join(project, 'src', 'shared', 'catalog.ts'), SHARED_MODULE);
  for (const name of SPLIT_FUNCTIONS) {
    await file(join(project, 'src', 'handlers', `${name}.ts`), HANDLERS[name]);
  }
  await file(join(project, 'prisma', 'schema.prisma'), PRISMA_SCHEMA);

  await writeNativePackage(nodeModules);
  await file(
    join(nodeModules, '@prisma', 'client', 'package.json'),
    `${JSON.stringify({ name: '@prisma/client', version: '5.22.0', main: 'index.js' })}\n`
  );
  await file(
    join(nodeModules, '@prisma', 'client', 'index.js'),
    "class PrismaClient {\n  engine = 'stub-client';\n}\nmodule.exports = { PrismaClient };\n"
  );
  const prismaEngine = join(nodeModules, '.prisma', 'client', PRISMA_ENGINE);
  await file(prismaEngine, '#!/bin/sh\necho prisma-engine\n', 0o755);
  await file(join(nodeModules, '.prisma', 'client', 'schema.prisma'), PRISMA_SCHEMA);
  await writeInstallMarker(project);

  const dockerInstall = join(root, 'docker install');
  await writeNativePackage(join(dockerInstall, 'node_modules'));
  const dockerDirectory = join(root, 'docker stand-in');
  await file(join(dockerDirectory, 'docker'), FAKE_DOCKER, 0o755);
  return { root, project, dockerInstall, dockerDirectory, prismaEngine };
};

import { describe, expect, test } from 'bun:test';
import dockerIgnore from '@balena/dockerignore';
import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  applyStacktapePlanPolicy,
  buildUsingRailpack,
  excludeNonSourceDirectories,
  getBuildEnvironmentHash,
  getRailpackVariables,
  pinPlanImages,
  takesVersionFromVersionControl,
  type RailpackPlan
} from './railpack';

const createPackagingError = ({ message, type }: { message: string; type: string }) =>
  Object.assign(new Error(message), { type });

/** Representative planner output for the pure policy rules. */
const preparedPlan = (overrides: Partial<RailpackPlan> = {}): RailpackPlan => ({
  steps: [{ name: 'install', commands: [{ cmd: 'uv sync' }] }],
  exclude: ['*.log', 'generated', '!generated/config.json'],
  deploy: {
    startCommand: 'uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}',
    variables: { RAILPACK_VERSION: '0.40.1' }
  },
  ...overrides
});

describe('railpack variables', () => {
  test('maps buildpack properties to railpack configuration and keeps build variables apart as secrets', () => {
    const { configuration, buildVariables } = getRailpackVariables({
      startCommand: 'gunicorn app:app',
      buildCommand: 'npm run build',
      installCommand: 'npm ci',
      packages: { node: '22', pnpm: '10' },
      aptPackages: ['ffmpeg', 'libvips'],
      buildEnvironment: [
        { name: 'VITE_API_URL', value: 'https://api.example.com' },
        { name: 'FLAG', value: true }
      ],
      createPackagingError
    });

    expect(configuration).toEqual({
      RAILPACK_SKIP_MIGRATIONS: 'true',
      RAILPACK_START_CMD: 'gunicorn app:app',
      RAILPACK_BUILD_CMD: 'npm run build',
      RAILPACK_INSTALL_CMD: 'npm ci',
      RAILPACK_PACKAGES: 'node@22 pnpm@10',
      RAILPACK_BUILD_APT_PACKAGES: 'ffmpeg libvips',
      RAILPACK_DEPLOY_APT_PACKAGES: 'ffmpeg libvips'
    });
    expect(buildVariables).toEqual({ VITE_API_URL: 'https://api.example.com', FLAG: 'true' });
  });

  test('rejects names railpack would misread and the reserved prefix', () => {
    expect(() =>
      getRailpackVariables({ buildEnvironment: [{ name: 'BAD NAME', value: 'x' }], createPackagingError })
    ).toThrow('invalid');
    expect(() =>
      getRailpackVariables({ buildEnvironment: [{ name: 'RAILPACK_START_CMD', value: 'x' }], createPackagingError })
    ).toThrow('RAILPACK_ prefix');
    expect(() =>
      getRailpackVariables({ buildEnvironment: [{ name: 'BUILDKIT_SYNTAX', value: 'x' }], createPackagingError })
    ).toThrow('BUILDKIT_ prefix');
    expect(() => getRailpackVariables({ packages: { node: '22 lts' }, createPackagingError })).toThrow('whitespace');
    expect(() => getRailpackVariables({ aptPackages: ['lib a'], createPackagingError })).toThrow('whitespace');
  });

  test('hashes build variable values independently of their order', () => {
    const forward = getBuildEnvironmentHash({ A: '1', B: '2' });
    expect(getBuildEnvironmentHash({ B: '2', A: '1' })).toBe(forward);
    expect(getBuildEnvironmentHash({ A: '1', B: '3' })).not.toBe(forward);
    expect(getBuildEnvironmentHash({})).toHaveLength(64);
  });
});

describe('plan policy', () => {
  test('repairs exact authored quote wrappers and leaves other commands intact', () => {
    const install = "printf '%s' 'install ok'";
    const build = "printf '%s' 'build ok'";
    const escapedInstall = `sh -c 'printf '"'"'%s'"'"' '"'"'install ok'"'"''`;
    const escapedBuild = `sh -c 'printf '"'"'%s'"'"' '"'"'build ok'"'"''`;
    const cases = [
      {
        label: 'authored install',
        customName: install,
        cmd: `sh -c '${install}'`,
        installCommand: install,
        expected: escapedInstall
      },
      {
        label: 'authored build',
        customName: build,
        cmd: `sh -c '${build}'`,
        buildCommand: build,
        expected: escapedBuild
      },
      {
        label: 'provider command',
        customName: build,
        cmd: `sh -c '${build}'`,
        installCommand: install,
        expected: `sh -c '${build}'`
      },
      {
        label: 'different wrapper',
        customName: install,
        cmd: `bash -c '${install}'`,
        installCommand: install,
        expected: `bash -c '${install}'`
      },
      {
        label: 'already escaped',
        customName: install,
        cmd: escapedInstall,
        installCommand: install,
        expected: escapedInstall
      },
      {
        label: 'command without apostrophes',
        customName: 'npm ci',
        cmd: "sh -c 'npm ci'",
        installCommand: 'npm ci',
        expected: "sh -c 'npm ci'"
      },
      {
        label: 'missing command metadata',
        customName: undefined,
        cmd: `sh -c '${install}'`,
        installCommand: install,
        expected: `sh -c '${install}'`
      },
      {
        label: 'different command metadata',
        customName: 'display label',
        cmd: `sh -c '${install}'`,
        installCommand: install,
        expected: `sh -c '${install}'`
      }
    ];

    for (const fixture of cases) {
      const command = { cmd: fixture.cmd, customName: fixture.customName, keep: 'planner metadata' };
      const plan = preparedPlan({ steps: [{ name: fixture.label, commands: [command] }] });
      const original = structuredClone(plan);
      const result = applyStacktapePlanPolicy({
        plan,
        startCommand: undefined,
        installCommand: fixture.installCommand,
        buildCommand: fixture.buildCommand
      });
      expect(result.steps).toEqual([{ name: fixture.label, commands: [{ ...command, cmd: fixture.expected }] }]);
      expect(plan).toEqual(original);
      if (fixture.cmd === fixture.expected) expect(result).toBe(plan);
      else expect(result).not.toBe(plan);
    }
  });

  test('removes the Django migration from a detected start command but keeps a configured one', () => {
    const plan = preparedPlan({
      deploy: {
        startCommand: 'python manage.py migrate && gunicorn --bind 0.0.0.0:${PORT:-8000} shop.wsgi:application'
      }
    });
    expect(applyStacktapePlanPolicy({ plan, startCommand: undefined }).deploy?.startCommand).toBe(
      'gunicorn --bind 0.0.0.0:${PORT:-8000} shop.wsgi:application'
    );
    expect(applyStacktapePlanPolicy({ plan, startCommand: 'python manage.py migrate && gunicorn shop.wsgi' })).toBe(
      plan
    );
    const untouched = preparedPlan();
    expect(applyStacktapePlanPolicy({ plan: untouched, startCommand: undefined })).toBe(untouched);
  });
});

/** The paths of a context that the plan's exclusions keep, as Docker selects them. */
const included = (plan: RailpackPlan, paths: string[]) =>
  dockerIgnore()
    .add(plan.exclude ?? [])
    .filter(paths);

describe('image context', () => {
  test('leaves version control, dependencies, caches and Stacktape output out of the image', () => {
    const paths = [
      'app.py',
      'requirements.txt',
      'templates/index.html',
      '.git/HEAD',
      '.stacktape/2026-10-16T00-00-00-000_x/build/out.zip',
      'node_modules/express/index.js',
      'web/node_modules/react/index.js',
      '.venv/bin/python',
      'pkg/__pycache__/mod.cpython-311.pyc',
      '.hg/store',
      'generated/data.bin',
      'generated/config.json',
      'server.log'
    ];
    expect(included(excludeNonSourceDirectories(preparedPlan()), paths)).toEqual([
      'app.py',
      'requirements.txt',
      'templates/index.html',
      'generated/config.json'
    ]);
  });

  test("lets the project's .dockerignore bring a directory back", () => {
    const plan = excludeNonSourceDirectories(preparedPlan({ exclude: ['!node_modules/vendored'] }));
    expect(included(plan, ['node_modules/express/index.js', 'node_modules/vendored/index.js', '.git/HEAD'])).toEqual([
      'node_modules/vendored/index.js'
    ]);
  });
});

/** A temporary project directory holding the given files. */
const projectWith = async (files: Record<string, string>) => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-railpack-vcs-'));
  await Promise.all(Object.entries(files).map(([name, contents]) => writeFile(join(directory, name), contents)));
  return directory;
};

describe('Python projects that take their version from version control', () => {
  test.each([
    ['hatch-vcs', { 'pyproject.toml': '[build-system]\nrequires = ["hatchling", "hatch-vcs"]\n' }, true],
    ['hatch version source', { 'pyproject.toml': '[tool.hatch.version]\nsource = "vcs"\n' }, true],
    ['setuptools-scm in pyproject', { 'pyproject.toml': '[tool.setuptools_scm]\n' }, true],
    ['setuptools-scm in setup.cfg', { 'setup.cfg': '[options]\nsetup_requires = setuptools_scm\n' }, true],
    [
      'setuptools-scm in setup.py',
      { 'setup.py': 'setup(use_scm_version=True, setup_requires=["setuptools-scm"])\n' },
      true
    ],
    ['a static version', { 'pyproject.toml': '[project]\nname = "shop"\nversion = "1.0.0"\n' }, false],
    ['no manifest', { 'requirements.txt': 'fastapi\n' }, false]
  ])('%s', async (_label, files, keeps) => {
    const directory = await projectWith(files);
    try {
      expect(await takesVersionFromVersionControl(directory)).toBe(keeps);
      const plan = excludeNonSourceDirectories(preparedPlan(), { keepVersionControl: keeps });
      expect(included(plan, ['.git/HEAD', '.stacktape/out.zip', 'app.py'])).toEqual(
        keeps ? ['.git/HEAD', 'app.py'] : ['app.py']
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('building a Railpack plan', () => {
  test('builds with the pinned frontend and asks for it to be kept local for the builder', async () => {
    const source = await mkdtemp(join(tmpdir(), 'stacktape-railpack-build-'));
    const frontend = 'ghcr.io/railwayapp/railpack-frontend:v0.40.1@sha256:' + 'a'.repeat(64);
    const builds: Record<string, unknown>[] = [];
    try {
      await writeFile(join(source, 'server.js'), 'console.log(1);\n');
      await buildUsingRailpack({
        name: 'web',
        cwd: source,
        existingDigests: [],
        dockerBuildOutputArchitecture: 'linux/arm64',
        railpackFrontendImage: frontend,
        progressLogger: {
          startEvent: async () => {},
          finishEvent: async () => {},
          updateEvent: async () => {}
        } as never,
        createPackagingError: createPackagingError as never,
        runRailpackPrepare: async () => ({
          plan: preparedPlan(),
          info: { success: true, detectedProviders: ['node'] }
        }),
        buildDockerImage: async (options) => {
          builds.push(options as Record<string, unknown>);
          return { size: 1, id: 'sha256:image', created: 0, dockerOutput: '', duration: 0 };
        }
      });
    } finally {
      await rm(source, { recursive: true, force: true });
    }
    expect(builds).toHaveLength(1);
    expect(builds[0]).toMatchObject({ buildArgs: { BUILDKIT_SYNTAX: frontend }, builderImages: [frontend] });
  });
});

test('pins the images a plan names wherever a step or the deploy names them, and nothing else', () => {
  const slim = 'public.ecr.aws/docker/library/python:3.11.14-slim';
  const uv = 'ghcr.io/astral-sh/uv:0.12.21';
  const plan = preparedPlan({
    steps: [
      { name: 'install', inputs: [{ image: slim }], commands: [{ image: uv, src: '/uv', dest: '/bin/uv' }] },
      { name: 'build', inputs: [{ step: 'install' }, { image: 'example.invalid/other:1' }] }
    ] as RailpackPlan['steps'],
    deploy: { base: { image: slim }, startCommand: 'python app.py' } as RailpackPlan['deploy']
  });
  const pinned = pinPlanImages(plan, {
    [slim]: `${slim}@sha256:${'1'.repeat(64)}`,
    [uv]: `${uv}@sha256:${'2'.repeat(64)}`
  });

  expect(JSON.stringify(pinned)).not.toContain(`${slim}"`);
  expect(JSON.stringify(pinned)).not.toContain(`${uv}"`);
  expect(pinned.steps?.[0]).toMatchObject({
    inputs: [{ image: `${slim}@sha256:${'1'.repeat(64)}` }],
    commands: [{ image: `${uv}@sha256:${'2'.repeat(64)}`, src: '/uv', dest: '/bin/uv' }]
  });
  expect(pinned.steps?.[1]).toEqual(plan.steps![1]!);
  expect((pinned.deploy as { base: unknown }).base).toEqual({ image: `${slim}@sha256:${'1'.repeat(64)}` });
  // The input is left as it was: the digest identifies the unpinned plan.
  expect(JSON.stringify(plan)).not.toContain('@sha256');
});

test.each([false, true])(
  'Python strict install failure=%s chooses image fallback before creating a swap artifact',
  async (fails) => {
    const source = await mkdtemp(join(tmpdir(), 'python-lock-fallback-'));
    let fallback = false;
    let finished = false;
    const commands: string[] = [];
    const baseImages: (string[] | undefined)[] = [];
    try {
      await writeFile(join(source, 'app.py'), 'print(1)');
      const plan = preparedPlan({
        steps: [{ name: 'install', commands: [{ cmd: 'uv pip install -r requirements.txt' }] }]
      });
      const result = await buildUsingRailpack({
        name: 'python',
        cwd: source,
        existingDigests: [],
        dockerBuildOutputArchitecture: 'linux/amd64',
        railpackFrontendImage: 'example.invalid/frontend@sha256:' + 'a'.repeat(64),
        progressLogger: {
          startEvent: async () => {},
          finishEvent: async () => {},
          updateEvent: async () => {}
        } as never,
        createPackagingError: createPackagingError as never,
        runRailpackPrepare: async () => ({ plan, info: { success: true, detectedProviders: ['python'] } }),
        imageExtension: {
          digestInput: {},
          existingDigests: [],
          prepare: async () => ({
            plan: {
              ...plan,
              steps: [{ name: 'install', commands: [{ cmd: 'uv pip install --require-hashes -r requirements.txt' }] }]
            },
            imageFallback: () => {
              fallback = true;
            },
            finish: async (imageId) => {
              expect(imageId).toBe('sha256:base');
              finished = true;
              return { dockerfileContents: 'FROM python-code-swap-base\n', buildContextPath: source };
            }
          })
        },
        buildDockerImage: async (options) => {
          const contents = await Bun.file(join(options.buildContextPath, options.dockerfilePath!)).text();
          commands.push(contents);
          baseImages.push(options.baseImages);
          if (fails && contents.includes('--require-hashes')) throw new Error('Unpinned transitive requirement');
          return {
            size: 1,
            id: contents.startsWith('FROM') ? 'sha256:swap' : 'sha256:base',
            dockerOutput: '',
            created: 0,
            duration: 0
          };
        }
      });
      expect(fallback).toBe(fails);
      expect(finished).toBe(!fails);
      expect(result.imageId).toBe(fails ? 'sha256:base' : 'sha256:swap');
      expect(commands).toHaveLength(2);
      if (fails) expect(commands[1]).not.toContain('--require-hashes');
      // The swap image starts from the measured base in the local store; nothing is pulled for it.
      else expect(baseImages[1]).toEqual([]);
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  }
);

/**
 * The Shelf monorepo of r2an 7: a batch job built from the repository root next to a function it never runs. The plan
 * is the one Railpack 0.40.1 made for it, reduced to the parts that select files and run commands.
 */
const shelfFiles = (manifests: Record<string, Record<string, unknown>> = {}) => {
  const manifest = (name: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ name, version: '0.0.0', private: true, ...extra, ...manifests[name] });
  return {
    'package.json': JSON.stringify({ name: 'shelf', private: true, scripts: { build: 'turbo run build' } }),
    'pnpm-workspace.yaml':
      'packages:\n  - apps/*\n  - packages/*\n  - functions/*\n  - jobs/*\nallowBuilds:\n  esbuild: true\n',
    'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
    'turbo.json': '{ // tasks\n "tasks": { "build": { "dependsOn": ["^build"] }, "typecheck": {} } }',
    'tsconfig.base.json': '{ "compilerOptions": { "strict": true } }',
    'apps/api/package.json': manifest('@shelf/api', { dependencies: { '@shelf/shared': 'workspace:*' } }),
    'apps/api/src/index.ts': 'export const api = 1;',
    'apps/web/package.json': manifest('@shelf/web', {
      scripts: { build: 'astro build' },
      dependencies: { '@shelf/shared': 'workspace:*' }
    }),
    'apps/web/src/pages/index.astro': '<h1>Shelf</h1>',
    'apps/recs/app.py': 'print(1)',
    'functions/quote/package.json': manifest('@shelf/quote', { dependencies: { '@shelf/shared': 'workspace:*' } }),
    'functions/quote/src/handler.ts': "import { price } from '@shelf/shared';\nexport const handler = () => price;",
    'functions/tax/src/main/java/shelf/TaxHandler.java': 'class TaxHandler {}',
    'jobs/report/package.json': manifest('@shelf/report', {
      scripts: { start: 'node --experimental-strip-types src/report.ts' },
      dependencies: { '@shelf/shared': 'workspace:*' }
    }),
    'jobs/report/src/report.ts': "import { price } from '@shelf/shared';\nconsole.log(price);",
    'jobs/report/tsconfig.json': '{ "extends": "../../tsconfig.base.json" }',
    'packages/shared/package.json': manifest('@shelf/shared'),
    'packages/shared/src/index.ts': 'export const price = 1;'
  } as Record<string, string>;
};

const shelfPlan = (overrides: { build?: string; start?: string; install?: string } = {}): RailpackPlan => ({
  steps: [
    { name: 'packages:mise', commands: [{ path: '/mise/shims' }, { cmd: 'mise install' }] },
    {
      name: 'install',
      commands: [
        { cmd: 'mkdir -p /app/node_modules/.cache' },
        ...[
          'apps/api/package.json',
          'apps/web/package.json',
          'functions/quote/package.json',
          'jobs/report/package.json',
          'package.json',
          'packages/shared/package.json',
          'pnpm-lock.yaml',
          'pnpm-workspace.yaml'
        ].map((path) => ({ src: path, dest: path })),
        { cmd: 'pnpm add -g node-gyp' },
        { cmd: overrides.install ?? 'pnpm install --frozen-lockfile --prefer-offline' }
      ]
    },
    {
      name: 'build',
      commands: [{ cmd: overrides.build ?? 'pnpm run build' }],
      inputs: [{ step: 'install' }, { local: true, include: ['.'] }]
    },
    {
      name: 'packages:apt:runtime',
      commands: [{ cmd: "sh -c 'apt-get update && apt-get install -y libatomic1'" }]
    }
  ],
  deploy: { startCommand: overrides.start ?? 'pnpm --filter @shelf/report start' }
});

const writeProject = async (files: Record<string, string>) => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-railpack-workspace-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), contents);
    })
  );
  return directory;
};

describe('a workspace member built from the repository root', () => {
  const buildDigest = async (source: string, plan: RailpackPlan) => {
    const result = await buildUsingRailpack({
      name: 'report',
      cwd: source,
      existingDigests: [],
      railpackFrontendImage: 'example.invalid/frontend@sha256:' + 'a'.repeat(64),
      progressLogger: { startEvent: async () => {}, finishEvent: async () => {}, updateEvent: async () => {} } as never,
      createPackagingError: createPackagingError as never,
      runRailpackPrepare: async () => ({ plan, info: { success: true, detectedProviders: ['node'] } }),
      buildDockerImage: async () => ({ size: 1, id: 'sha256:image', created: 0, dockerOutput: '', duration: 0 })
    });
    return {
      digest: result.digest,
      files: (result.sourceFiles ?? []).map(({ path }) => path.slice(source.length + 1)).toSorted()
    };
  };

  /** The digest after appending a line to each file, one file at a time, starting from the same project. */
  const digestsAfterEdits = async ({
    files = shelfFiles(),
    plan = shelfPlan(),
    edits
  }: {
    files?: Record<string, string>;
    plan?: RailpackPlan;
    edits: string[];
  }) => {
    const source = await writeProject(files);
    try {
      const { digest: baseline, files: context } = await buildDigest(source, plan);
      const changed: Record<string, boolean> = {};
      // Each edit is measured alone against the same project, so they run one after another.
      for (const path of edits) {
        // oxlint-disable-next-line no-await-in-loop -- see above
        await appendFile(join(source, path), '\n// edited\n');
        // oxlint-disable-next-line no-await-in-loop -- see above
        changed[path] = (await buildDigest(source, plan)).digest !== baseline;
        // oxlint-disable-next-line no-await-in-loop -- see above
        await writeFile(join(source, path), files[path]!);
      }
      expect((await buildDigest(source, plan)).digest).toBe(baseline);
      return { changed, context };
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  };

  test('an edit of a package the image never runs keeps its digest; an edit of what it runs or builds changes it', async () => {
    const { changed, context } = await digestsAfterEdits({
      edits: [
        'functions/quote/src/handler.ts',
        'functions/tax/src/main/java/shelf/TaxHandler.java',
        'apps/recs/app.py',
        'apps/api/src/index.ts',
        'functions/quote/package.json',
        'jobs/report/src/report.ts',
        'packages/shared/src/index.ts',
        // The root build runs `turbo run build`, which builds the web app into the image.
        'apps/web/src/pages/index.astro',
        'tsconfig.base.json',
        'pnpm-lock.yaml'
      ]
    });
    expect(changed).toEqual({
      'functions/quote/src/handler.ts': false,
      'functions/tax/src/main/java/shelf/TaxHandler.java': false,
      'apps/recs/app.py': false,
      'apps/api/src/index.ts': false,
      // The install reads every workspace manifest.
      'functions/quote/package.json': true,
      'jobs/report/src/report.ts': true,
      'packages/shared/src/index.ts': true,
      'apps/web/src/pages/index.astro': true,
      'tsconfig.base.json': true,
      'pnpm-lock.yaml': true
    });
    // The source files the packaging result reports are the image's own inputs.
    expect(context).toContain('jobs/report/src/report.ts');
    expect(context).toContain('functions/quote/package.json');
    expect(context).not.toContain('functions/quote/src/handler.ts');
  });

  test.each([
    ['a build of only the job and its dependencies', { build: 'pnpm --filter @shelf/report... run build' }, false],
    [
      'npm workspace commands',
      { start: 'npm start --workspace=@shelf/report', build: 'npm run build --workspaces' },
      true
    ],
    ['a custom install that adds a package', { install: 'pnpm install left-pad' }, true],
    ['a root script that runs a file', { build: 'node scripts/build.js' }, true],
    ['a start command at the root', { start: 'node jobs/report/src/report.ts' }, true],
    ['a filter that selects dependents', { start: 'pnpm --filter ...@shelf/report start' }, true],
    ['a command with shell expansion', { build: 'pnpm --filter $PACKAGE build' }, true]
  ] as const)('%s', async (_label, overrides, webChanges) => {
    const { changed } = await digestsAfterEdits({
      plan: shelfPlan(overrides),
      edits: ['apps/web/src/pages/index.astro', 'functions/quote/src/handler.ts']
    });
    expect(changed['apps/web/src/pages/index.astro']).toBe(webChanges);
    // Only the npm build, which builds every workspace with a build script, and the commands that cannot be followed
    // keep the whole context.
    expect(changed['functions/quote/src/handler.ts']).toBe(
      webChanges && !(overrides as { start?: string }).start?.startsWith('npm')
    );
  });

  test.each([
    [
      'the install runs its script',
      { manifests: { '@shelf/quote': { scripts: { postinstall: 'node gen.js' } } } },
      'functions/quote/src/handler.ts'
    ],
    [
      'the install links its executable',
      { manifests: { '@shelf/quote': { bin: './src/cli.js' } } },
      'functions/quote/src/handler.ts'
    ],
    [
      'the job imports one of its files by a relative path',
      { files: { 'jobs/report/src/report.ts': "import { handler } from '../../../functions/quote/src/handler.ts';" } },
      'functions/quote/src/handler.ts'
    ],
    [
      'a TypeScript path of the job maps a module name into it',
      {
        files: {
          'jobs/report/tsconfig.json':
            '{ "compilerOptions": { "paths": { "@quote/*": ["../../functions/quote/src/*"] } } } // comment'
        }
      },
      'functions/quote/src/handler.ts'
    ],
    [
      'a root TypeScript path maps a module name into it',
      {
        files: { 'tsconfig.base.json': '{ "compilerOptions": { "paths": { "@api": ["./apps/api/src/index.ts"] } } }' }
      },
      'apps/api/src/index.ts'
    ],
    [
      'the job depends on it through a dependency',
      { manifests: { '@shelf/shared': { devDependencies: { '@shelf/quote': 'workspace:*' } } } },
      'functions/quote/src/handler.ts'
    ]
  ] as const)('keeps a package whole when %s', async (_label, change, path) => {
    const files = {
      ...shelfFiles('manifests' in change ? (change.manifests as Record<string, Record<string, unknown>>) : {}),
      ...('files' in change ? change.files : {})
    };
    const { changed } = await digestsAfterEdits({ files, edits: [path, 'apps/recs/app.py'] });
    expect(changed).toEqual({ [path]: true, 'apps/recs/app.py': false });
  });

  test('a project that is not a workspace root keeps its whole context', async () => {
    const files = shelfFiles();
    delete files['pnpm-workspace.yaml'];
    const { changed } = await digestsAfterEdits({ files, edits: ['functions/quote/src/handler.ts'] });
    expect(changed).toEqual({ 'functions/quote/src/handler.ts': true });
  });

  test('a `.dockerignore` exception of the project still brings a file of a reduced package back', async () => {
    const files = { ...shelfFiles(), '.dockerignore': '!functions/quote/src/handler.ts\n' };
    const source = await writeProject(files);
    try {
      const plan = { ...shelfPlan(), exclude: ['!functions/quote/src/handler.ts'] };
      expect((await buildDigest(source, plan)).files).toContain('functions/quote/src/handler.ts');
      expect((await buildDigest(source, plan)).files).not.toContain('apps/api/src/index.ts');
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  });
});

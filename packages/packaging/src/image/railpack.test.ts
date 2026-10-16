import { describe, expect, test } from 'bun:test';
import dockerIgnore from '@balena/dockerignore';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyStacktapePlanPolicy,
  buildUsingRailpack,
  excludeNonSourceDirectories,
  getBuildEnvironmentHash,
  getRailpackVariables,
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

import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import type { BuildDockerImage, PackagingProgressLogger, RunRailpackPrepare } from '../runtime-contracts';
import {
  applyStacktapePlanPolicy,
  buildUsingRailpack,
  getBuildEnvironmentHash,
  getRailpackVariables,
  type RailpackPlan
} from './railpack';

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
const createPackagingError = ({ message, type }: { message: string; type: string }) =>
  Object.assign(new Error(message), { type });

const FRONTEND = 'ghcr.io/railwayapp/railpack-frontend:v0.40.1';

const createProject = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-railpack-'));
  temporaryDirectories.push(root);
  const source = join(root, 'api');
  await mkdir(join(source, 'generated'), { recursive: true });
  await writeFile(join(source, 'pyproject.toml'), '[project]\nname = "api"\n');
  await writeFile(join(source, 'main.py'), 'print("hello")\n');
  await writeFile(join(source, 'notes.log'), 'first\n');
  await writeFile(join(source, 'generated', 'config.json'), '{"a":1}\n');
  await writeFile(join(source, '.dockerignore'), '*.log\ngenerated\n');
  return { root, source };
};

/** What `railpack prepare` writes for the project above: the plan carries the merged exclusions. */
const preparedPlan = (overrides: Partial<RailpackPlan> = {}): RailpackPlan => ({
  steps: [{ name: 'install', commands: [{ cmd: 'uv sync' }] }],
  exclude: ['*.log', 'generated', '!generated/config.json'],
  deploy: {
    startCommand: 'uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}',
    variables: { RAILPACK_VERSION: '0.40.1' }
  },
  ...overrides
});

type Recorded = {
  prepares: Parameters<RunRailpackPrepare>[0][];
  builds: Parameters<BuildDockerImage>[0][];
};

const createActions = ({ plan = preparedPlan(), success = true }: { plan?: RailpackPlan; success?: boolean } = {}) => {
  const recorded: Recorded = { prepares: [], builds: [] };
  const runRailpackPrepare: RunRailpackPrepare = async (input) => {
    recorded.prepares.push(input);
    return {
      plan,
      info: {
        railpackVersion: '0.40.1',
        success,
        detectedProviders: ['python'],
        metadata: { pythonRuntime: 'fastapi' },
        resolvedPackages: { python: { name: 'python', resolvedVersion: '3.13.15' } },
        logs: success ? [] : [{ Level: 'error', Msg: 'No start command found' }]
      }
    };
  };
  const buildDockerImage: BuildDockerImage = async (input) => {
    recorded.builds.push(input);
    return { size: 151, id: 'sha256:image', created: 1, dockerOutput: '', duration: 1 };
  };
  return { recorded, runRailpackPrepare, buildDockerImage };
};

const build = async ({
  root,
  existingDigests = [],
  actions,
  ...props
}: {
  root: string;
  existingDigests?: string[];
  actions: ReturnType<typeof createActions>;
  startCommand?: string;
  buildEnvironment?: { name: string; value: string }[];
}) =>
  buildUsingRailpack({
    name: 'api',
    cwd: root,
    sourceDirectoryPath: 'api',
    progressLogger,
    existingDigests,
    railpackFrontendImage: FRONTEND,
    createPackagingError,
    runRailpackPrepare: actions.runRailpackPrepare,
    buildDockerImage: actions.buildDockerImage,
    ...props
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
  test('keeps only the build variables as secrets, never railpack configuration variables', () => {
    const plan = preparedPlan({
      secrets: ['RAILPACK_SKIP_MIGRATIONS', 'RAILPACK_START_CMD', 'VITE_API_URL'],
      steps: [
        { name: 'install', secrets: ['RAILPACK_START_CMD', 'VITE_API_URL'] },
        { name: 'build', secrets: ['*'] }
      ]
    });
    const policed = applyStacktapePlanPolicy({ plan, startCommand: 'npm start' });
    expect(policed.secrets).toEqual(['VITE_API_URL']);
    expect(policed.steps).toEqual([
      { name: 'install', secrets: ['VITE_API_URL'] },
      { name: 'build', secrets: ['*'] }
    ]);
    expect(plan.secrets).toHaveLength(3);
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

describe('railpack image build', () => {
  test('plans through the runner, builds the plan with the pinned frontend and mounts build variables as secrets', async () => {
    const { root } = await createProject();
    const actions = createActions();

    const result = await build({
      root,
      actions,
      buildEnvironment: [{ name: 'VITE_API_URL', value: 'https://api.example.com' }]
    });

    expect(result.outcome).toBe('bundled');
    expect(result.imageName).toBe('api');
    expect(actions.recorded.prepares).toHaveLength(1);
    expect(actions.recorded.prepares[0]!.variables).toEqual({
      RAILPACK_SKIP_MIGRATIONS: 'true',
      VITE_API_URL: 'https://api.example.com'
    });
    const [dockerBuild] = actions.recorded.builds;
    expect(dockerBuild!.buildArgs).toEqual({
      BUILDKIT_SYNTAX: FRONTEND,
      'secrets-hash': getBuildEnvironmentHash({ VITE_API_URL: 'https://api.example.com' }),
      'cache-key': 'api'
    });
    expect(dockerBuild!.secrets).toEqual({ VITE_API_URL: 'https://api.example.com' });
    expect(dockerBuild!.buildContextPath).toBe(join(root, 'api'));
    // The plan is the "Dockerfile". It is written to the temporary directory: outside the context, so it never ends
    // up in the image, and outside the customer's project, so a failed build leaves nothing behind there.
    const planFilePath = resolve(dockerBuild!.buildContextPath, dockerBuild!.dockerfilePath!);
    expect(dirname(planFilePath)).toBe(resolve(tmpdir()));
    expect(basename(planFilePath)).toMatch(/^stp-image-.*\.Dockerfile$/);
  });

  test('reuses the image only while source, plan, frontend and build variable values are unchanged', async () => {
    const { root, source } = await createProject();
    const first = await build({ root, actions: createActions() });
    expect(first.outcome).toBe('bundled');

    const unchanged = await build({ root, actions: createActions(), existingDigests: [first.digest] });
    expect(unchanged.outcome).toBe('skipped');
    expect(unchanged.size).toBeNull();

    // A build variable value is not in the plan; it must still invalidate the artifact.
    const variableChanged = await build({
      root,
      actions: createActions(),
      existingDigests: [first.digest],
      buildEnvironment: [{ name: 'VITE_API_URL', value: 'https://other.example.com' }]
    });
    expect(variableChanged.outcome).toBe('bundled');
    expect(variableChanged.digest).not.toBe(first.digest);

    const planChanged = await build({
      root,
      actions: createActions({ plan: preparedPlan({ deploy: { startCommand: 'uvicorn main:app --port 9000' } }) }),
      existingDigests: [first.digest]
    });
    expect(planChanged.digest).not.toBe(first.digest);

    await writeFile(join(source, 'main.py'), 'print("changed")\n');
    const sourceChanged = await build({ root, actions: createActions(), existingDigests: [first.digest] });
    expect(sourceChanged.digest).not.toBe(first.digest);
  });

  test('hashes exactly the files the plan selects, including negated exclusions', async () => {
    const { root, source } = await createProject();
    const first = await build({ root, actions: createActions() });

    // Excluded by the plan (.dockerignore): not part of the build, must not invalidate it.
    await writeFile(join(source, 'notes.log'), 'second\n');
    const ignoredChanged = await build({ root, actions: createActions(), existingDigests: [first.digest] });
    expect(ignoredChanged.outcome).toBe('skipped');

    // Under an excluded directory, but negated back in by the plan: part of the build, must invalidate it.
    await writeFile(join(source, 'generated', 'config.json'), '{"a":2}\n');
    const negatedChanged = await build({ root, actions: createActions(), existingDigests: [first.digest] });
    expect(negatedChanged.outcome).toBe('bundled');
    expect(negatedChanged.sourceFiles?.map(({ path }) => path)).toContain(join(source, 'generated', 'config.json'));
    expect(negatedChanged.sourceFiles?.map(({ path }) => path)).not.toContain(join(source, 'notes.log'));
  });

  test('reports a failed detection with railpack diagnostics and never starts Docker', async () => {
    const { root } = await createProject();
    const actions = createActions({ success: false });

    await expect(build({ root, actions })).rejects.toMatchObject({
      type: 'RAILPACK',
      message: expect.stringContaining('No start command found')
    });
    expect(actions.recorded.builds).toHaveLength(0);
  });

  test('fails before planning when the source directory does not exist', async () => {
    const { root } = await createProject();
    const actions = createActions();
    await expect(
      buildUsingRailpack({
        name: 'api',
        cwd: root,
        sourceDirectoryPath: 'missing',
        progressLogger,
        existingDigests: [],
        railpackFrontendImage: FRONTEND,
        createPackagingError,
        runRailpackPrepare: actions.runRailpackPrepare,
        buildDockerImage: actions.buildDockerImage
      })
    ).rejects.toThrow('does not exist');
    expect(actions.recorded.prepares).toHaveLength(0);
  });
});

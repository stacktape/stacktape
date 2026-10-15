import { describe, expect, test } from 'bun:test';
import { STACKTAPE_UV_VERSION, usePythonSlimImage } from './railpack-python';

const BUILDER = 'ghcr.io/railwayapp/railpack-builder:mise-2026.9.15';
const RUNTIME = 'ghcr.io/railwayapp/railpack-runtime:mise-2026.9.15';
const MISE_OUTPUTS = ['/mise/shims', '/mise/installs', '/usr/local/bin/mise', '/etc/mise/config.toml'];

const miseStep = (input: Record<string, unknown> = { image: BUILDER }) => ({
  name: 'packages:mise',
  inputs: [input],
  commands: [
    { path: '/mise/shims' },
    { src: '.python-version', dest: '.python-version' },
    { name: 'generated-mise-toml', path: '/etc/mise/config.toml', customName: 'create mise config' },
    { cmd: 'mise install', customName: 'install mise packages: python' }
  ],
  variables: { MISE_DATA_DIR: '/mise' }
});

const deploy = (base: Record<string, unknown> = { image: RUNTIME }) => ({
  base,
  inputs: [
    { step: 'packages:mise', include: MISE_OUTPUTS },
    { step: 'build', include: ['/app/.venv'] },
    { step: 'build', include: ['.'], exclude: ['.venv'] }
  ],
  startCommand: 'uvicorn app:app --host 0.0.0.0 --port $PORT',
  variables: { PYTHONUNBUFFERED: '1' }
});

/** Railpack 0.40.1's plan for a `requirements.txt` project, trimmed to the parts the rewrite reads. */
const pipPlan = () => ({
  caches: { pip: { directory: '/opt/pip-cache', type: 'shared' } },
  exclude: ['.stacktape'],
  steps: [
    miseStep(),
    {
      name: 'install',
      inputs: [{ step: 'packages:mise' }],
      caches: ['pip'],
      commands: [
        { cmd: 'python -m venv /app/.venv' },
        { path: '/app/.venv/bin' },
        { src: 'requirements.txt', dest: 'requirements.txt' },
        { cmd: 'pip install -r requirements.txt' }
      ],
      variables: { PIP_CACHE_DIR: '/opt/pip-cache', VIRTUAL_ENV: '/app/.venv' }
    },
    { name: 'build', inputs: [{ step: 'install' }, { local: true, include: ['.'] }], secrets: ['*'] }
  ],
  deploy: deploy()
});
const pipInfo = (packages: Record<string, string> = { python: '3.11.14' }) => ({
  detectedProviders: ['python'],
  resolvedPackages: Object.fromEntries(
    Object.entries(packages).map(([name, resolvedVersion]) => [name, { resolvedVersion }])
  )
});

/** Railpack 0.40.1's plan for a `uv.lock` project. */
const uvPlan = () => ({
  caches: { uv: { directory: '/opt/uv-cache', type: 'shared' } },
  steps: [
    miseStep(),
    {
      name: 'install',
      inputs: [{ step: 'packages:mise' }],
      caches: ['uv'],
      commands: [
        { src: 'pyproject.toml', dest: 'pyproject.toml' },
        { src: 'uv.lock', dest: 'uv.lock' },
        { path: '/root/.local/bin' },
        { path: '/app/.venv/bin' },
        { cmd: 'uv sync --locked --no-dev --no-install-project' }
      ],
      variables: { UV_CACHE_DIR: '/opt/uv-cache', UV_PYTHON_DOWNLOADS: 'never' }
    },
    {
      name: 'build',
      inputs: [{ step: 'install' }, { local: true, include: ['.'] }],
      commands: [{ cmd: 'uv sync --locked --no-dev --no-editable' }]
    }
  ],
  deploy: deploy()
});

/** A pip project whose dependencies make Railpack add build (libpq-dev) and runtime (libpq5) apt packages. */
const aptPlan = () => {
  const plan = pipPlan();
  return {
    ...plan,
    steps: [
      {
        name: 'packages:apt:build',
        inputs: [{ image: BUILDER }],
        caches: ['apt', 'apt-lists'],
        commands: [{ cmd: "sh -c 'apt-get update && apt-get install -y libpq-dev'" }]
      },
      miseStep({ step: 'packages:apt:build' }),
      ...plan.steps.slice(1),
      {
        name: 'packages:apt:runtime',
        inputs: [{ image: RUNTIME }],
        caches: ['apt', 'apt-lists'],
        commands: [{ cmd: "sh -c 'apt-get update && apt-get install -y libpq5'" }]
      }
    ],
    deploy: deploy({ step: 'packages:apt:runtime' })
  };
};

const SLIM = 'public.ecr.aws/docker/library/python:3.11.14-slim';
type TestStep = { name: string; inputs?: unknown[]; commands?: Record<string, unknown>[] };
const stepNamed = (plan: { steps?: unknown[] }, name: string) =>
  (plan.steps as TestStep[]).find((step) => step.name === name);
/** Each command as its shell command, or the whole command when it does not run one. */
const commandsOf = (plan: { steps?: unknown[] }, name: string): unknown[] =>
  stepNamed(plan, name)?.commands?.map((command) => command.cmd ?? command) ?? [];

describe('Python plans on the official slim image', () => {
  test('a requirements.txt project installs with uv on the slim image and keeps pip as the fallback', () => {
    const plan = pipPlan();
    const original = structuredClone(plan);
    const result = usePythonSlimImage({ plan, info: pipInfo(), keepPip: false });
    expect(plan).toEqual(original);
    expect(result?.image).toBe(SLIM);
    const rewritten = result!.plan;
    expect(rewritten.steps.map((step) => step.name)).toEqual(['install', 'build']);
    expect(stepNamed(rewritten, 'install')?.inputs).toEqual([{ image: SLIM }]);
    const install = commandsOf(rewritten, 'install');
    expect(install[0]).toEqual({
      image: `ghcr.io/astral-sh/uv:${STACKTAPE_UV_VERSION}`,
      src: '/uv',
      dest: '/usr/local/bin/uv'
    });
    expect(install.slice(1, 4)).toEqual([
      'uv venv --seed /app/.venv',
      { path: '/app/.venv/bin' },
      { src: 'requirements.txt', dest: 'requirements.txt' }
    ]);
    expect(String(install[4])).toStartWith("sh -c 'uv pip install -r requirements.txt || {");
    expect(String(install[4])).toContain('apt-get install -y --no-install-recommends build-essential');
    expect(String(install[4])).toEndWith("&& pip install -r requirements.txt; }'");
    expect(rewritten.caches as unknown).toEqual({
      pip: { directory: '/opt/pip-cache', type: 'shared' },
      uv: { directory: '/opt/uv-cache', type: 'shared' }
    });
    expect(stepNamed(rewritten, 'build')).toEqual(original.steps[2]);
    expect(rewritten.deploy).toEqual({
      ...original.deploy,
      base: { image: SLIM },
      inputs: original.deploy.inputs.slice(1)
    });
    expect(rewritten.exclude).toEqual(['.stacktape']);
    expect(JSON.stringify(rewritten)).not.toContain('mise');
  });

  test('pip configured through PIP_ variables stays pip', () => {
    const rewritten = usePythonSlimImage({ plan: pipPlan(), info: pipInfo(), keepPip: true })!.plan;
    const install = commandsOf(rewritten, 'install');
    expect(install.slice(0, 3)).toEqual([
      'python -m venv /app/.venv',
      { path: '/app/.venv/bin' },
      { src: 'requirements.txt', dest: 'requirements.txt' }
    ]);
    expect(String(install[3])).toStartWith("sh -c 'pip install -r requirements.txt || {");
    expect(rewritten.caches).toEqual(pipPlan().caches);
    expect(JSON.stringify(rewritten)).not.toContain('astral-sh/uv');
  });

  test('a uv project uses the uv release Railpack resolved', () => {
    const rewritten = usePythonSlimImage({
      plan: uvPlan(),
      info: pipInfo({ python: '3.13.16', uv: '0.11.3' }),
      keepPip: false
    })!.plan;
    const slim313 = 'public.ecr.aws/docker/library/python:3.13.16-slim';
    expect(stepNamed(rewritten, 'install')?.inputs).toEqual([{ image: slim313 }]);
    const install = commandsOf(rewritten, 'install');
    expect(install[0]).toEqual({ image: 'ghcr.io/astral-sh/uv:0.11.3', src: '/uv', dest: '/usr/local/bin/uv' });
    expect(String(install.at(-1))).toStartWith("sh -c 'uv sync --locked --no-dev --no-install-project || {");
    expect(String(install.at(-1))).toEndWith("&& uv sync --locked --no-dev --no-install-project; }'");
    expect(commandsOf(rewritten, 'build')).toEqual(['uv sync --locked --no-dev --no-editable']);
    expect(rewritten.deploy?.base).toEqual({ image: slim313 });
  });

  test('apt packages Railpack adds for the build and the runtime are installed on the slim image', () => {
    const rewritten = usePythonSlimImage({ plan: aptPlan(), info: pipInfo(), keepPip: false })!.plan;
    expect(rewritten.steps.map((step) => step.name)).toEqual([
      'packages:apt:build',
      'install',
      'build',
      'packages:apt:runtime'
    ]);
    expect(stepNamed(rewritten, 'packages:apt:build')?.inputs).toEqual([{ image: SLIM }]);
    expect(stepNamed(rewritten, 'packages:apt:runtime')?.inputs).toEqual([{ image: SLIM }]);
    expect(stepNamed(rewritten, 'install')?.inputs).toEqual([{ step: 'packages:apt:build' }]);
    expect(rewritten.deploy?.base).toEqual({ step: 'packages:apt:runtime' });
  });

  test('a local layer an install needs stays in place', () => {
    const plan = pipPlan();
    plan.steps[1]!.inputs = [{ step: 'packages:mise' }, { local: true, include: ['.'] } as never];
    expect(stepNamed(usePythonSlimImage({ plan, info: pipInfo(), keepPip: false })!.plan, 'install')?.inputs).toEqual([
      { image: SLIM },
      { local: true, include: ['.'] }
    ]);
  });

  test('every other plan is built as Railpack wrote it', () => {
    const buildCopyingFromMise = () => {
      const plan = pipPlan();
      plan.steps[2]!.inputs!.push({ step: 'packages:mise', include: ['/mise'] } as never);
      return plan;
    };
    const withInstall = (cmd: string) => {
      const plan = pipPlan();
      plan.steps[1]!.commands = [{ src: '.', dest: '.' } as never, { cmd } as never];
      return plan;
    };
    const cases: { label: string; plan: ReturnType<typeof pipPlan>; info: ReturnType<typeof pipInfo> }[] = [
      { label: 'another provider', plan: pipPlan(), info: { ...pipInfo(), detectedProviders: ['node'] } },
      { label: 'two providers', plan: pipPlan(), info: { ...pipInfo(), detectedProviders: ['python', 'node'] } },
      { label: 'an extra package', plan: pipPlan(), info: pipInfo({ python: '3.11.14', node: '22.11.0' }) },
      { label: 'Poetry', plan: pipPlan(), info: pipInfo({ python: '3.11.14', poetry: '2.1.0' }) },
      { label: 'Pipenv', plan: pipPlan(), info: pipInfo({ python: '3.11.14', pipx: '1.7.1', uv: '0.12.21' }) },
      { label: 'a free-threaded build', plan: pipPlan(), info: pipInfo({ python: '3.13.1t' }) },
      { label: 'no resolved Python', plan: pipPlan(), info: pipInfo({}) },
      { label: 'a custom install command', plan: withInstall("sh -c 'pip install .'"), info: pipInfo() },
      { label: 'a uv sync without uv', plan: uvPlan() as never, info: pipInfo() },
      {
        label: 'a custom step',
        plan: {
          ...pipPlan(),
          steps: [...pipPlan().steps, { name: 'assets', inputs: [{ image: 'node:22' }] }]
        } as never,
        info: pipInfo()
      },
      {
        label: 'a runtime path into mise',
        plan: { ...pipPlan(), deploy: { ...deploy(), paths: ['/mise/shims'] } } as never,
        info: pipInfo()
      },
      { label: 'a step that copies from mise', plan: buildCopyingFromMise(), info: pipInfo() },
      {
        label: 'another base image',
        plan: { ...pipPlan(), deploy: deploy({ image: 'debian:trixie' }) },
        info: pipInfo()
      }
    ];
    for (const { label, plan, info } of cases) {
      expect({ label, result: usePythonSlimImage({ plan, info, keepPip: false }) }).toEqual({
        label,
        result: undefined
      });
    }
  });
});

/**
 * Railpack builds every Python project on its 430 MB builder image, installs the interpreter there with mise, and ships
 * mise (130 MB unpacked), that interpreter and the virtual environment on its runtime image. For a pip or uv project
 * nothing else needs mise, so Stacktape builds the same plan on the official `python:<version>-slim` image instead: one
 * 45 MB image serves as builder and runtime, the interpreter is already in it, and the image is less than half the size.
 * Railpack still detects the project, chooses the Python version and writes every step; only the images and the
 * dependency install change. Any plan that does not have exactly the expected shape is built unchanged.
 */

/** The parts of a Railpack plan this rewrite reads. Everything else is passed through untouched. */
type PlanLayer = {
  image?: string | undefined;
  step?: string | undefined;
  local?: boolean | undefined;
  include?: string[] | undefined;
  exclude?: string[] | undefined;
};
type PlanCommand = {
  cmd?: string | undefined;
  customName?: string | undefined;
  path?: string | undefined;
  src?: string | undefined;
  dest?: string | undefined;
  image?: string | undefined;
  name?: string | undefined;
};
type PlanStep = {
  name: string;
  inputs?: PlanLayer[] | undefined;
  commands?: PlanCommand[] | undefined;
  caches?: string[] | undefined;
  variables?: Record<string, string> | undefined;
  [key: string]: unknown;
};
type PythonPlan = {
  steps?: unknown[] | undefined;
  caches?: Record<string, unknown> | undefined;
  deploy?: { base?: unknown; inputs?: unknown; [key: string]: unknown } | undefined;
  [key: string]: unknown;
};

type PythonPlanInfo = {
  detectedProviders?: string[] | undefined;
  resolvedPackages?: Record<string, { resolvedVersion: string }> | undefined;
};

const RAILPACK_BUILDER_IMAGE = 'ghcr.io/railwayapp/railpack-builder:';
const RAILPACK_RUNTIME_IMAGE = 'ghcr.io/railwayapp/railpack-runtime:';
const MISE_STEP = 'packages:mise';
const BUILD_APT_STEP = 'packages:apt:build';
const RUNTIME_APT_STEP = 'packages:apt:runtime';
const RAILPACK_PYTHON_STEPS = new Set([MISE_STEP, BUILD_APT_STEP, RUNTIME_APT_STEP, 'install', 'build']);
const RELEASE_VERSION = /^\d+\.\d+\.\d+$/;

/** The uv release used for `requirements.txt` projects. A uv project uses the version Railpack resolved for it. */
export const STACKTAPE_UV_VERSION = '0.12.21';
/** The official uv image: a static binary at `/uv`, for both Linux architectures. */
const uvImage = (version: string) => `ghcr.io/astral-sh/uv:${version}`;
/** Docker's official Python image through ECR Public, which has no anonymous pull limit like Docker Hub's. */
const pythonSlimImage = (version: string) => `public.ecr.aws/docker/library/python:${version}-slim`;

/** The commands Railpack 0.40 writes into the install step. Any other install command keeps the plan unchanged. */
const PIP_CREATE_VENV = 'python -m venv /app/.venv';
const PIP_INSTALL = 'pip install -r requirements.txt';
const UV_SYNC = 'uv sync --locked --no-dev --no-install-project';
const UV_CACHE_DIRECTORY = '/opt/uv-cache';

/**
 * The slim image has no compiler. When a dependency has no wheel for the platform, the install falls back to these
 * packages (the compiler, git for VCS requirements, and the headers Railpack's builder image carries for common
 * Python extensions) and to pip, so the build still succeeds where Railpack's would. The step is cached either way.
 */
const BUILD_TOOLCHAIN = [
  'build-essential',
  'pkg-config',
  'git',
  'libffi-dev',
  'libssl-dev',
  'zlib1g-dev',
  'libjpeg-dev',
  'libpng-dev',
  'libxml2-dev',
  'libxmlsec1-dev',
  'libpq-dev',
  'default-libmysqlclient-dev'
].join(' ');

const withToolchainFallback = ({ command, fallback }: { command: string; fallback: string }): PlanCommand => ({
  cmd: `sh -c '${command} || { echo "Installing build tools to compile dependencies that have no prebuilt wheel" >&2; apt-get update && apt-get install -y --no-install-recommends ${BUILD_TOOLCHAIN} && ${fallback}; }'`,
  customName: command
});

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isImageLayer = (layer: unknown, imagePrefix: string): boolean =>
  isObject(layer) &&
  typeof layer.image === 'string' &&
  layer.image.startsWith(imagePrefix) &&
  Object.keys(layer).length === 1;
const isWholeStepLayer = (layer: unknown, step: string): boolean =>
  isObject(layer) && layer.step === step && Object.keys(layer).length === 1;
const isLocalLayer = (layer: unknown): boolean => isObject(layer) && layer.local === true;

/** The install commands, rewritten for the slim image, or `undefined` when they are not Railpack's own. */
const rewriteInstallCommands = ({
  commands,
  uvVersion,
  keepPip
}: {
  commands: PlanCommand[];
  uvVersion: string | undefined;
  keepPip: boolean;
}): { commands: PlanCommand[]; usesUv: boolean } | undefined => {
  const executed = commands.flatMap((command) => (command.cmd === undefined ? [] : [command.cmd]));
  const copyUv: PlanCommand = {
    image: uvImage(uvVersion ?? STACKTAPE_UV_VERSION),
    src: '/uv',
    dest: '/usr/local/bin/uv'
  };
  if (executed.length === 2 && executed[0] === PIP_CREATE_VENV && executed[1] === PIP_INSTALL) {
    const pipInstall = withToolchainFallback({ command: PIP_INSTALL, fallback: PIP_INSTALL });
    if (keepPip) {
      return {
        commands: commands.map((command) => (command.cmd === PIP_INSTALL ? pipInstall : command)),
        usesUv: false
      };
    }
    // uv installs the same requirements several times faster than pip. The environment keeps pip (`--seed`), so
    // `pip` and `python -m pip` in build commands and at run time behave as in Railpack's own environment.
    return {
      commands: [
        copyUv,
        ...commands.map((command) => {
          if (command.cmd === PIP_CREATE_VENV) return { cmd: 'uv venv --seed /app/.venv' };
          if (command.cmd === PIP_INSTALL)
            return withToolchainFallback({ command: 'uv pip install -r requirements.txt', fallback: PIP_INSTALL });
          return command;
        })
      ],
      usesUv: true
    };
  }
  if (uvVersion !== undefined && executed.length === 1 && executed[0] === UV_SYNC) {
    return {
      commands: [
        copyUv,
        ...commands.map((command) =>
          command.cmd === UV_SYNC ? withToolchainFallback({ command: UV_SYNC, fallback: UV_SYNC }) : command
        )
      ],
      usesUv: true
    };
  }
  return undefined;
};

/**
 * Rebuilds a Railpack Python plan on the official slim image. Returns `undefined`, and the caller builds Railpack's
 * plan unchanged, unless Python is the only provider, the only tools are Python and uv, and the steps are the ones
 * Railpack writes for a pip (`requirements.txt`) or uv (`uv.lock`) project. Poetry, PDM and Pipenv projects, extra
 * `packages`, custom install commands and custom steps keep Railpack's plan.
 *
 * `keepPip` keeps pip for a `requirements.txt` project, for builds that configure pip through `PIP_*` variables
 * (a private index, for example), which uv does not read.
 */
export const usePythonSlimImage = <Plan extends PythonPlan>({
  plan,
  info,
  keepPip
}: {
  plan: Plan;
  info: PythonPlanInfo;
  keepPip: boolean;
}): { plan: Plan; image: string } | undefined => {
  if (info.detectedProviders?.length !== 1 || info.detectedProviders[0] !== 'python') return undefined;
  const packages = info.resolvedPackages ?? {};
  if (Object.keys(packages).some((name) => name !== 'python' && name !== 'uv')) return undefined;
  const pythonVersion = packages.python?.resolvedVersion;
  const uvVersion = packages.uv?.resolvedVersion;
  if (pythonVersion === undefined || !RELEASE_VERSION.test(pythonVersion)) return undefined;
  if (uvVersion !== undefined && !RELEASE_VERSION.test(uvVersion)) return undefined;
  if (!Array.isArray(plan.steps) || !plan.steps.every((step) => isObject(step) && typeof step.name === 'string')) {
    return undefined;
  }
  const steps = plan.steps as PlanStep[];
  if (!steps.every((step) => RAILPACK_PYTHON_STEPS.has(step.name))) return undefined;
  const stepNamed = (name: string) => steps.find((step) => step.name === name);
  const miseStep = stepNamed(MISE_STEP);
  const installStep = stepNamed('install');
  const buildStep = stepNamed('build');
  if (!miseStep || !installStep || !buildStep) return undefined;

  const image = pythonSlimImage(pythonVersion);
  const imageLayer: PlanLayer = { image };
  const buildAptStep = stepNamed(BUILD_APT_STEP);
  const runtimeAptStep = stepNamed(RUNTIME_APT_STEP);
  if (
    buildAptStep &&
    !(buildAptStep.inputs?.length === 1 && isImageLayer(buildAptStep.inputs[0], RAILPACK_BUILDER_IMAGE))
  )
    return undefined;
  if (
    runtimeAptStep &&
    !(runtimeAptStep.inputs?.length === 1 && isImageLayer(runtimeAptStep.inputs[0], RAILPACK_RUNTIME_IMAGE))
  )
    return undefined;
  // The steps that used mise's interpreter start from the image, or from the image with the build apt packages.
  const miseInput = miseStep.inputs?.length === 1 ? miseStep.inputs[0] : undefined;
  let builderLayer: PlanLayer;
  if (buildAptStep && isWholeStepLayer(miseInput, BUILD_APT_STEP)) builderLayer = { step: BUILD_APT_STEP };
  else if (!buildAptStep && isImageLayer(miseInput, RAILPACK_BUILDER_IMAGE)) builderLayer = imageLayer;
  else return undefined;

  if (!installStep.inputs?.every((layer) => isWholeStepLayer(layer, MISE_STEP) || isLocalLayer(layer)))
    return undefined;
  if (!installStep.inputs.some((layer) => isWholeStepLayer(layer, MISE_STEP))) return undefined;
  const install = rewriteInstallCommands({ commands: installStep.commands ?? [], uvVersion, keepPip });
  if (!install) return undefined;

  const deploy = plan.deploy;
  if (!deploy || !Array.isArray(deploy.inputs)) return undefined;
  let deployBase: unknown;
  if (runtimeAptStep && isWholeStepLayer(deploy.base, RUNTIME_APT_STEP)) deployBase = deploy.base;
  else if (!runtimeAptStep && isImageLayer(deploy.base, RAILPACK_RUNTIME_IMAGE)) deployBase = imageLayer;
  else return undefined;
  const deployInputs = (deploy.inputs as unknown[]).filter((layer) => !(isObject(layer) && layer.step === MISE_STEP));
  if (deployInputs.length !== (deploy.inputs as unknown[]).length - 1) return undefined;

  const rewrittenSteps = steps.flatMap((step): PlanStep[] => {
    if (step === miseStep) return [];
    if (step === buildAptStep || step === runtimeAptStep) return [{ ...step, inputs: [imageLayer] }];
    if (step !== installStep) return [step];
    return [
      {
        ...step,
        inputs: step.inputs?.map((layer) => (isWholeStepLayer(layer, MISE_STEP) ? builderLayer : layer)),
        commands: install.commands,
        ...(install.usesUv
          ? {
              caches: [...new Set([...(step.caches ?? []), 'uv'])],
              variables: {
                ...step.variables,
                UV_CACHE_DIR: UV_CACHE_DIRECTORY,
                UV_COMPILE_BYTECODE: '1',
                UV_LINK_MODE: 'copy',
                UV_PYTHON_DOWNLOADS: 'never'
              }
            }
          : {})
      }
    ];
  });
  const rewritten: Plan = {
    ...plan,
    ...(install.usesUv ? { caches: { ...plan.caches, uv: { directory: UV_CACHE_DIRECTORY, type: 'shared' } } } : {}),
    steps: rewrittenSteps,
    deploy: { ...deploy, base: deployBase, inputs: deployInputs }
  };
  // Nothing may still refer to mise, its directories or Railpack's images; otherwise build Railpack's plan.
  const serialized = JSON.stringify(rewritten);
  if (
    serialized.includes(RAILPACK_BUILDER_IMAGE) ||
    serialized.includes(RAILPACK_RUNTIME_IMAGE) ||
    serialized.includes(`"${MISE_STEP}"`) ||
    serialized.includes('/mise/')
  ) {
    return undefined;
  }
  return { plan: rewritten, image };
};

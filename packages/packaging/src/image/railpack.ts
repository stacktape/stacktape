import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { pathExists } from 'fs-extra';
import objectHash from 'object-hash';
import type { BuildpackCwImagePackagingProps } from '@stacktape/config/deployment-artifacts';
import type { EnvironmentVar } from '@stacktape/config/shared';
import type {
  BuildDockerImage,
  CreatePackagingError,
  DockerBuildOutputArchitecture,
  PackagingOutput,
  PackagingProgressLogger,
  PinLocalBaseImage,
  RunRailpackPrepare
} from '../runtime-contracts';
import { packagingMessages } from '../runtime-contracts';
import { getDockerContextChecksum } from '../artifact/docker-context';
import { buildGeneratedDockerImage } from '../artifact/generated-image-build';
import { mergeHashes } from '../artifact/hashing';
import { NON_SOURCE_DIRECTORY_NAMES } from '../artifact/language-build-context';
import { usePythonSlimImage } from './railpack-python';

/** The parts of a Railpack build plan Stacktape reads or edits. Everything else is passed through untouched. */
export type RailpackPlan = {
  exclude?: string[] | undefined;
  secrets?: string[] | undefined;
  steps?: unknown[] | undefined;
  deploy?: { startCommand?: string | undefined; [key: string]: unknown } | undefined;
  [key: string]: unknown;
};

export type RailpackInfo = {
  railpackVersion?: string | undefined;
  success: boolean;
  detectedProviders?: string[] | undefined;
  metadata?: Record<string, string> | undefined;
  resolvedPackages?:
    | Record<string, { name: string; requestedVersion?: string | undefined; resolvedVersion: string; source?: string }>
    | undefined;
  logs?: { Level: string; Msg: string; DocsPath?: string }[] | undefined;
};

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NO_WHITESPACE = /^\S+$/;

/**
 * Railpack's Django provider starts the container with `python manage.py migrate && gunicorn ...`, and its PHP start
 * script runs migrations unless told not to. Stacktape runs migrations as deployment hooks, once per deployment, not
 * in every task that starts, so a detected start command is kept but its migration prefix is removed.
 */
const DJANGO_MIGRATE_PREFIX = 'python manage.py migrate && ';

const toValueString = (value: EnvironmentVar['value']) => `${value}`;

/**
 * The hash BuildKit gets as `secrets-hash`: a changed build variable value must rebuild the layers that read it,
 * which BuildKit does not do for secret mounts on its own. Sorted by name, so the result does not depend on the
 * order the variables were written in.
 */
export const getBuildEnvironmentHash = (variables: Record<string, string>): string => {
  const hash = createHash('sha256');
  for (const name of Object.keys(variables).toSorted()) {
    hash.update(`${name}=${variables[name]}\0`);
  }
  return hash.digest('hex');
};

/** What the `buildpack` properties become for Railpack: variables of its planner and secrets of the build. */
export const getRailpackVariables = ({
  startCommand,
  buildCommand,
  installCommand,
  packages,
  aptPackages,
  buildEnvironment,
  createPackagingError
}: {
  startCommand?: string | undefined;
  buildCommand?: string | undefined;
  installCommand?: string | undefined;
  packages?: Record<string, string> | undefined;
  aptPackages?: string[] | undefined;
  buildEnvironment?: EnvironmentVar[] | undefined;
  createPackagingError: CreatePackagingError;
}): {
  /** Railpack's own configuration variables (`RAILPACK_*`). Their values are not secret. */
  configuration: Record<string, string>;
  /** The user's build variables. Their values are Docker build secrets. */
  buildVariables: Record<string, string>;
} => {
  const configuration: Record<string, string> = {
    // See DJANGO_MIGRATE_PREFIX: the PHP start script honours this variable.
    RAILPACK_SKIP_MIGRATIONS: 'true'
  };
  if (startCommand !== undefined) configuration.RAILPACK_START_CMD = startCommand;
  if (buildCommand !== undefined) configuration.RAILPACK_BUILD_CMD = buildCommand;
  if (installCommand !== undefined) configuration.RAILPACK_INSTALL_CMD = installCommand;
  if (packages && Object.keys(packages).length > 0) {
    const entries = Object.entries(packages);
    const invalid = entries.find(([name, version]) => !NO_WHITESPACE.test(name) || !NO_WHITESPACE.test(version));
    if (invalid) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Buildpack package "${invalid[0]}: ${invalid[1]}" is invalid: names and versions cannot contain whitespace.`
      });
    }
    configuration.RAILPACK_PACKAGES = entries.map(([name, version]) => `${name}@${version}`).join(' ');
  }
  if (aptPackages && aptPackages.length > 0) {
    const invalid = aptPackages.find((name) => !NO_WHITESPACE.test(name));
    if (invalid !== undefined) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Buildpack apt package "${invalid}" is invalid: package names cannot contain whitespace.`
      });
    }
    configuration.RAILPACK_BUILD_APT_PACKAGES = aptPackages.join(' ');
    configuration.RAILPACK_DEPLOY_APT_PACKAGES = aptPackages.join(' ');
  }
  const buildVariables: Record<string, string> = {};
  for (const { name, value } of buildEnvironment ?? []) {
    if (!ENV_NAME.test(name)) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Build environment variable name "${name}" is invalid. Use letters, digits and underscores, not starting with a digit.`
      });
    }
    if (name.startsWith('BUILDKIT_')) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Build environment variable "${name}" uses the BUILDKIT_ prefix, which Docker reads as a build setting (for example BUILDKIT_SYNTAX selects the frontend). Rename it.`
      });
    }
    if (name.startsWith('RAILPACK_')) {
      throw createPackagingError({
        type: 'PACKAGING',
        message: `Build environment variable "${name}" uses the RAILPACK_ prefix, which Stacktape reserves for the buildpack's own settings. Use the buildpack properties (startCommand, buildCommand, installCommand, packages, aptPackages) instead.`
      });
    }
    buildVariables[name] = toValueString(value);
  }
  return { configuration, buildVariables };
};

const isRailpackConfigurationVariable = (name: string) => name.startsWith('RAILPACK_');

/**
 * Applies Stacktape's policies to a plan Railpack produced. Returns a new plan; the input is not modified.
 *
 * Railpack records every planner variable as a build secret, its own `RAILPACK_*` configuration included, and the
 * frontend then refuses to build unless each one is mounted. The configuration values are already in the plan (the
 * commands, packages and apt lists they produced), so they are removed from the secret list; only the user's build
 * variables stay secrets.
 */
export const applyStacktapePlanPolicy = ({
  plan,
  startCommand,
  buildCommand,
  installCommand
}: {
  plan: RailpackPlan;
  startCommand: string | undefined;
  buildCommand?: string | undefined;
  installCommand?: string | undefined;
}): RailpackPlan => {
  let result = plan;
  if (plan.secrets?.some(isRailpackConfigurationVariable)) {
    const steps = Array.isArray(plan.steps)
      ? (plan.steps as { secrets?: string[] }[]).map((step) =>
          step.secrets?.some(isRailpackConfigurationVariable)
            ? Object.assign({}, step, {
                secrets: step.secrets.filter((name) => !isRailpackConfigurationVariable(name))
              })
            : step
        )
      : plan.steps;
    result = { ...result, secrets: plan.secrets.filter((name) => !isRailpackConfigurationVariable(name)), steps };
  }
  // Railpack 0.40.1 emits an authored command as `sh -c '<command>'` without escaping quotes inside it.
  // Correct only that exact wrapper for commands the user supplied; provider-generated commands stay intact.
  const authoredCommands = new Set([buildCommand, installCommand].filter((command) => command !== undefined));
  let repairedCommand = false;
  const steps =
    authoredCommands.size > 0 && Array.isArray(result.steps)
      ? result.steps.map((step) => {
          if (typeof step !== 'object' || step === null) return step;
          const commands = (step as { commands?: unknown }).commands;
          if (!Array.isArray(commands)) return step;
          return Object.assign({}, step, {
            commands: commands.map((command: unknown) => {
              if (typeof command !== 'object' || command === null) return command;
              const { cmd, customName } = command as { cmd?: unknown; customName?: unknown };
              if (
                typeof customName !== 'string' ||
                !authoredCommands.has(customName) ||
                !customName.includes("'") ||
                cmd !== `sh -c '${customName}'`
              )
                return command;
              repairedCommand = true;
              return Object.assign({}, command, { cmd: `sh -c '${customName.replaceAll("'", `'"'"'`)}'` });
            })
          });
        })
      : result.steps;
  if (repairedCommand) result = { ...result, steps };
  const detectedStart = result.deploy?.startCommand;
  if (startCommand === undefined && detectedStart?.startsWith(DJANGO_MIGRATE_PREFIX)) {
    result = {
      ...result,
      deploy: { ...result.deploy, startCommand: detectedStart.slice(DJANGO_MIGRATE_PREFIX.length) }
    };
  }
  return result;
};

const VERSION_CONTROL_DIRECTORIES = new Set(['.git', '.hg']);
/** Python build plugins that read the package version from version control: setuptools-scm, hatch-vcs and the like. */
const VERSION_FROM_VCS =
  /setuptools[_-]scm|hatch[_-]vcs|\[tool\.hatch\.version\][^[]*source\s*=\s*["']vcs["']|versioningit|poetry[_-]dynamic[_-]versioning/;

/**
 * Keeps version control data, installed dependencies, caches and Stacktape's own output out of the image. Railpack
 * copies the whole source directory and excludes only what `.dockerignore` lists, so without this an image carried
 * `.git` and `.stacktape`, grew with every build and changed its digest when the source had not. The patterns come
 * first: a `!` pattern in the project's `.dockerignore`, which Railpack puts in the plan after them, still brings a
 * directory back. A Python project that takes its version from version control keeps `.git` and `.hg`.
 */
export const excludeNonSourceDirectories = (
  plan: RailpackPlan,
  { keepVersionControl = false }: { keepVersionControl?: boolean } = {}
): RailpackPlan => ({
  ...plan,
  exclude: [
    ...NON_SOURCE_DIRECTORY_NAMES.filter((name) => !(keepVersionControl && VERSION_CONTROL_DIRECTORIES.has(name))).map(
      (name) => `**/${name}`
    ),
    ...(plan.exclude ?? [])
  ]
});

/**
 * Whether a Python project takes its version from version control, so its build needs `.git`. setuptools-scm and
 * hatch-vcs fail the install without it.
 */
export const takesVersionFromVersionControl = async (sourceDirectoryPath: string): Promise<boolean> => {
  const manifests = await Promise.all(
    ['pyproject.toml', 'setup.cfg', 'setup.py'].map((name) =>
      readFile(join(sourceDirectoryPath, name), 'utf8').catch(() => '')
    )
  );
  return manifests.some((contents) => VERSION_FROM_VCS.test(contents));
};

/** The planner's own diagnostics, with build variable values removed in case a provider echoed one. */
/** The plan with each image reference in `references` replaced by its pinned form, wherever a step or the deploy names it. */
export const pinPlanImages = (plan: RailpackPlan, references: Record<string, string>): RailpackPlan => {
  const pin = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(pin);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        key === 'image' && typeof entry === 'string' ? (references[entry] ?? entry) : pin(entry)
      ])
    );
  };
  return pin(plan) as RailpackPlan;
};

const describeRailpackFailure = (info: RailpackInfo | undefined, secretValues: string[]) =>
  (info?.logs ?? [])
    .filter((log) => log.Level === 'error' || log.Level === 'warn')
    .map((log) => secretValues.filter(Boolean).reduce((text, value) => text.split(value).join('[redacted]'), log.Msg))
    .join('\n');

export const buildUsingRailpack = async ({
  name,
  cwd,
  progressLogger,
  existingDigests,
  dockerBuildOutputArchitecture,
  cacheFromRef,
  cacheToRef,
  railpackFrontendImage,
  buildDockerImage,
  runRailpackPrepare,
  pinLocalBaseImage,
  createPackagingError,
  sourceDirectoryPath = '.',
  startCommand,
  buildCommand,
  installCommand,
  packages,
  aptPackages,
  buildEnvironment,
  railpackConfig,
  imageExtension
}: {
  imageExtension?: {
    digestInput: unknown;
    existingDigests: string[];
    prepare: (input: {
      packagingDigest: string;
      sourceDirectoryPath: string;
      includedFilePaths: string[];
      plan: RailpackPlan;
      python: boolean;
      baseInputs: string;
      baseImage: string;
    }) => Promise<{ dockerfileContents: string; buildContextPath: string } | undefined>;
  };
  name: string;
  cwd: string;
  progressLogger: PackagingProgressLogger;
  existingDigests: string[];
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  cacheFromRef?: string | undefined;
  cacheToRef?: string | undefined;
  /** The Railpack BuildKit frontend image of the pinned Railpack release, pinned by digest. */
  railpackFrontendImage: string;
  buildDockerImage: BuildDockerImage;
  runRailpackPrepare: RunRailpackPrepare;
  /**
   * Pins the images a Python plan starts from to their local digests. Railpack's frontend asks the registry for every
   * image a plan names by tag, about 0.3 s per build, even when the image is local. The digest keeps identifying the
   * unpinned plan, so a refreshed base image does not change it. Unused with a registry cache, whose builder does not
   * read the local image store.
   */
  pinLocalBaseImage?: PinLocalBaseImage | undefined;
  createPackagingError: CreatePackagingError;
} & BuildpackCwImagePackagingProps): Promise<PackagingOutput> => {
  const start = Date.now();
  const absoluteSourceDirectoryPath = isAbsolute(sourceDirectoryPath)
    ? resolve(sourceDirectoryPath)
    : resolve(join(cwd, sourceDirectoryPath));
  if (!(await pathExists(absoluteSourceDirectoryPath))) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Buildpack source directory ${sourceDirectoryPath} does not exist (resolved to ${absoluteSourceDirectoryPath}).`
    });
  }
  const { configuration, buildVariables } = getRailpackVariables({
    startCommand,
    buildCommand,
    installCommand,
    packages,
    aptPackages,
    buildEnvironment,
    createPackagingError
  });

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Detecting the build with Railpack and calculating checksum for caching'
  });
  const prepared = await runRailpackPrepare({
    sourceDirectoryPath: absoluteSourceDirectoryPath,
    variables: { ...configuration, ...buildVariables },
    config: railpackConfig
  });
  const info = prepared.info as RailpackInfo | undefined;
  if (!info?.success) {
    const details = describeRailpackFailure(info, Object.values(buildVariables));
    throw createPackagingError({
      type: 'RAILPACK',
      message: `Railpack could not plan a build for ${sourceDirectoryPath}.${details ? `\n${details}` : ''}`,
      hint: 'Railpack detects the language from the project files in the source directory. Set startCommand, buildCommand or installCommand when detection is incomplete, or use dockerfile packaging for full control.'
    });
  }
  const railpackPlan = excludeNonSourceDirectories(
    applyStacktapePlanPolicy({
      plan: prepared.plan as RailpackPlan,
      startCommand,
      buildCommand,
      installCommand
    }),
    { keepVersionControl: await takesVersionFromVersionControl(absoluteSourceDirectoryPath) }
  );
  const python = usePythonSlimImage({
    plan: railpackPlan,
    info,
    keepPip: Object.keys(buildVariables).some((variableName) => variableName.startsWith('PIP_'))
  });
  const plan = python?.plan ?? railpackPlan;
  const buildEnvironmentHash = getBuildEnvironmentHash(buildVariables);
  const { checksum: contextChecksum, includedFilePaths } = await getDockerContextChecksum({
    absoluteBuildContextPath: absoluteSourceDirectoryPath,
    includeDockerfile: false,
    // The plan carries the effective exclusions: the directory's .dockerignore merged with Railpack's own `exclude`,
    // including negations. The frontend selects the context with the same list.
    ignorePatterns: plan.exclude ?? []
  });
  const digest = mergeHashes(
    contextChecksum,
    objectHash({
      plan,
      railpackFrontendImage,
      dockerBuildOutputArchitecture,
      buildEnvironmentHash,
      ...(imageExtension && { imageExtension: imageExtension.digestInput })
    })
  );
  const resolvedPackages = Object.values(info.resolvedPackages ?? {}).map(
    ({ name: packageName, resolvedVersion }) => `${packageName} ${resolvedVersion}`
  );
  const detection = [
    ...(info.detectedProviders ?? []),
    ...resolvedPackages,
    ...(python ? [`built on ${python.image.split('/').at(-1)}`] : [])
  ].join(', ');
  if ((imageExtension?.existingDigests ?? existingDigests).includes(digest)) {
    await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM', finalMessage: packagingMessages.unchanged });
    return {
      digest,
      outcome: 'skipped',
      details: { duration: Date.now() - start, railpackVersion: info.railpackVersion, detection },
      sourceFiles: [],
      size: null,
      jobName: name
    };
  }
  await progressLogger.finishEvent({
    eventType: 'CALCULATE_CHECKSUM',
    finalMessage: detection ? `Detected ${detection}` : undefined
  });

  const baseImage = imageExtension ? `${name}-code-swap-base` : name;
  const extension = await imageExtension?.prepare({
    packagingDigest: digest,
    sourceDirectoryPath: absoluteSourceDirectoryPath,
    includedFilePaths,
    plan,
    python: Boolean(python) && !cacheFromRef && !cacheToRef,
    baseInputs: JSON.stringify({ plan, railpackFrontendImage, dockerBuildOutputArchitecture, buildEnvironmentHash }),
    baseImage
  });
  await progressLogger.startEvent({ eventType: 'BUILD_IMAGE', description: 'Building docker image with Railpack' });
  const pinnedPlan =
    python && pinLocalBaseImage && !cacheFromRef && !cacheToRef
      ? pinPlanImages(
          plan,
          Object.fromEntries(
            await Promise.all(
              python.baseImages.map(
                async (reference) =>
                  [reference, await pinLocalBaseImage({ reference, platform: dockerBuildOutputArchitecture })] as const
              )
            )
          )
        )
      : plan;
  let { size, id, dockerOutput, duration, created } = await buildGeneratedDockerImage({
    dockerfileContents: JSON.stringify(pinnedPlan),
    // The context is the customer's source directory: the plan file stays out of their project tree.
    buildFileDirectoryPath: tmpdir(),
    buildDockerImage,
    imageTag: extension ? baseImage : name,
    buildContextPath: absoluteSourceDirectoryPath,
    dockerBuildOutputArchitecture,
    cacheFromRef,
    cacheToRef,
    ...(python ? { baseImages: python.baseImages } : {}),
    builderImages: [railpackFrontendImage],
    buildArgs: {
      BUILDKIT_SYNTAX: railpackFrontendImage,
      'secrets-hash': buildEnvironmentHash,
      'cache-key': name
    },
    secrets: buildVariables
  });
  if (extension) {
    const extended = await buildGeneratedDockerImage({
      ...extension,
      buildDockerImage,
      imageTag: name,
      dockerBuildOutputArchitecture,
      cacheFromRef,
      cacheToRef
    });
    size = extended.size;
    id = extended.id;
    created = extended.created;
    dockerOutput = (dockerOutput ?? '') + (extended.dockerOutput ?? '');
    duration += extended.duration;
  }
  await progressLogger.finishEvent({ eventType: 'BUILD_IMAGE', finalMessage: packagingMessages.containerImage(size) });

  return {
    outcome: 'bundled',
    size,
    digest,
    imageName: name,
    imageId: id,
    sourceFiles: includedFilePaths.map((path) => ({ path })),
    details: {
      duration,
      dockerOutput,
      imageCreated: created,
      railpackVersion: info.railpackVersion,
      detection,
      totalDuration: Date.now() - start
    },
    jobName: name
  };
};

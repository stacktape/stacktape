import type {
  GetDockerImageDetails,
  PackagingProgressLogger as ProgressLogger,
  ProcessResult,
  RunNixpacks
} from '../runtime-contracts';
import type { DockerBuildOutputArchitecture, PackagingOutput } from '../runtime-contracts';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFile, readJson, readdir, remove } from 'fs-extra';
import objectHash from 'object-hash';
import { parse as parseToml } from 'smol-toml';

import type { NixpacksBjImagePackagingProps } from '@stacktape/config/deployment-artifacts';
import { mergeHashes } from '../artifact/hashing';
import { getAllFilesInDir } from '../fs/files';
import { createTemporaryBuildFile } from '../fs/temporary-file';
import { getDockerContextChecksum } from '../artifact/docker-context';

export const buildUsingNixpacks = async ({
  name,
  progressLogger,
  existingDigests,
  cwd,
  dockerBuildOutputArchitecture,
  getDockerImageDetails,
  runNixpacks,
  ...restProps
}: {
  name: string;
  progressLogger: ProgressLogger;
  cwd: string;
  existingDigests: string[];
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  getDockerImageDetails: GetDockerImageDetails;
  runNixpacks: RunNixpacks;
} & NixpacksBjImagePackagingProps): Promise<PackagingOutput> => {
  const { buildImage, phases, providers, startCmd, startOnlyIncludeFiles, startRunImage, sourceDirectoryPath } =
    restProps;
  const nixpacksPackagingProps: NixpacksBjImagePackagingProps = {
    sourceDirectoryPath,
    ...(buildImage !== undefined ? { buildImage } : {}),
    ...(phases !== undefined ? { phases } : {}),
    ...(providers !== undefined ? { providers } : {}),
    ...(startCmd !== undefined ? { startCmd } : {}),
    ...(startOnlyIncludeFiles !== undefined ? { startOnlyIncludeFiles } : {}),
    ...(startRunImage !== undefined ? { startRunImage } : {})
  };
  const absoluteSourceDirectoryPath = join(cwd, sourceDirectoryPath);
  const start = Date.now();
  if (startOnlyIncludeFiles && !startRunImage) {
    throw new Error(
      'Nixpacks startOnlyIncludeFiles requires startRunImage because filtering occurs in the runtime stage.'
    );
  }

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const { checksum: contextChecksum } = await getDockerContextChecksum({
    absoluteBuildContextPath: absoluteSourceDirectoryPath,
    includeDockerfile: false,
    // Nixpacks plans on the host before Docker applies .dockerignore. Its manifests and phase configuration must
    // remain cache inputs even when the generated Docker build later excludes them.
    applyDockerIgnore: false
  });
  const digest = mergeHashes(
    contextChecksum,
    objectHash({
      buildImage,
      phases,
      providers,
      startCmd,
      startOnlyIncludeFiles,
      startRunImage,
      dockerBuildOutputArchitecture
    })
  );
  if (existingDigests.includes(digest)) {
    await progressLogger.finishEvent({
      eventType: 'CALCULATE_CHECKSUM',
      finalMessage: 'Same artifact is already deployed, skipping.'
    });
    return {
      digest,
      outcome: 'skipped' as const,
      details: { duration: Date.now() - start },
      sourceFiles: [],
      size: null,
      jobName: name
    };
  }
  await progressLogger.finishEvent({ eventType: 'CALCULATE_CHECKSUM' });

  await progressLogger.startEvent({
    eventType: 'BUILD_IMAGE',
    description: 'Building docker image using nixpacks.'
  });

  const configFilePath = await createTemporaryNixpacksConfigFile({
    packagingProps: nixpacksPackagingProps,
    absoluteSourceDirectoryPath
  });

  let buildResult:
    | {
        succeeded: true;
        imageDetails: Awaited<ReturnType<typeof getDockerImageDetails>>;
        buildOutput: ProcessResult;
      }
    | { succeeded: false; error: unknown };
  try {
    const buildOutput = await runNixpacks({
      cwd: absoluteSourceDirectoryPath,
      args: [
        'build',
        '.',
        '--name',
        name,
        '--config',
        configFilePath,
        ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : [])
      ]
    });
    const imageDetails = await getDockerImageDetails(name);
    buildResult = { succeeded: true, imageDetails, buildOutput };
  } catch (error) {
    buildResult = { succeeded: false, error };
  }

  try {
    await remove(configFilePath);
  } catch (cleanupError) {
    if (buildResult.succeeded) {
      throw cleanupError;
    }
  }

  if ('error' in buildResult) {
    throw buildResult.error;
  }
  const { buildOutput, imageDetails } = buildResult;

  await progressLogger.finishEvent({
    eventType: 'BUILD_IMAGE',
    finalMessage: `Image size: ${imageDetails.size} MB.`
  });

  const allFilesInSourceDir = await getAllFilesInDir(absoluteSourceDirectoryPath, false);

  return {
    outcome: 'bundled',
    size: imageDetails.size,
    digest,
    imageName: name,
    // @todo
    sourceFiles: allFilesInSourceDir.map((path) => ({ path })),
    details: { duration: Date.now() - start, buildOutput, ...imageDetails },
    jobName: name
  };
};

const createTemporaryNixpacksConfigFile = async ({
  packagingProps,
  absoluteSourceDirectoryPath
}: {
  packagingProps: NixpacksBjImagePackagingProps;
  absoluteSourceDirectoryPath: string;
}) => {
  const nixpacksConfig = await getNixpacksConfig({ packagingProps, absoluteSourceDirectoryPath });

  const { filePath } = await createTemporaryBuildFile({
    contents: JSON.stringify(nixpacksConfig, null, 2),
    directoryPath: tmpdir(),
    prefix: 'stp-nixpacks-',
    suffix: '.json'
  });
  return filePath;
};

const getNixpacksConfig = async ({
  packagingProps,
  absoluteSourceDirectoryPath
}: {
  packagingProps: NixpacksBjImagePackagingProps;
  absoluteSourceDirectoryPath: string;
}): Promise<Record<string, unknown>> => {
  const appDirectoryContents = await readdir(absoluteSourceDirectoryPath);
  // Nixpacks documents TOML as its primary config format. Make precedence deterministic when both formats exist.
  const existingNixpacksConfigFile = ['nixpacks.toml', 'nixpacks.json'].find((fileName) =>
    appDirectoryContents.includes(fileName)
  );
  let userNixpacksConfig: Record<string, unknown> = {};
  if (existingNixpacksConfigFile) {
    const existingNixpacksConfigFilePath = join(absoluteSourceDirectoryPath, existingNixpacksConfigFile);
    const parsedConfig: unknown = existingNixpacksConfigFile.endsWith('.toml')
      ? parseToml(await readFile(existingNixpacksConfigFilePath, 'utf8'))
      : await readJson(existingNixpacksConfigFilePath);
    if (isRecord(parsedConfig)) {
      userNixpacksConfig = parsedConfig;
    }
  }

  const {
    sourceDirectoryPath: _,
    startCmd,
    startOnlyIncludeFiles,
    startRunImage,
    phases,
    ...restNixpackProps
  } = packagingProps;

  const finalConfig: Record<string, unknown> = {
    ...userNixpacksConfig,
    ...restNixpackProps
  };
  if (phases) {
    const formattedPhases = phases.reduce(
      (finalPhases, phase) => {
        const { name, ...phaseProps } = phase;

        finalPhases[name] = { ...phaseProps };
        return finalPhases;
      },
      {} as Record<string, unknown>
    );
    finalConfig.phases = {
      ...(isRecord(finalConfig.phases) ? finalConfig.phases : {}),
      ...formattedPhases
    };
  }
  if (startCmd || startOnlyIncludeFiles || startRunImage) {
    const startConfig: Record<string, unknown> = isRecord(finalConfig.start) ? { ...finalConfig.start } : {};
    if (startCmd) {
      startConfig.cmd = startCmd;
    }
    if (startOnlyIncludeFiles) {
      startConfig.onlyIncludeFiles = startOnlyIncludeFiles;
    }
    if (startRunImage) {
      startConfig.runImage = startRunImage;
    }
    finalConfig.start = startConfig;
  }
  return finalConfig;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

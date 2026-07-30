import type {
  CreatePackagingError,
  GetDockerImageDetails,
  PackagingProgressLogger as ProgressLogger,
  ProcessResult,
  RunNixpacks
} from '../runtime-contracts';
import type { DockerBuildOutputArchitecture, PackagingOutput } from '../runtime-contracts';
import { join } from 'node:path';
import { parse as parseIni } from 'ini';
import { readFile, readJson, readdir, remove, writeJson } from 'fs-extra';
import objectHash from 'object-hash';

import type { NixpacksBjImagePackagingProps } from '@stacktape/config/deployment-artifacts';
import { EXCLUDE_FROM_CHECKSUM_GLOBS, getDirectoryChecksum, mergeHashes } from '../artifact/hashing';
import { getAllFilesInDir } from '../fs/files';

export const buildUsingNixpacks = async ({
  name,
  progressLogger,
  existingDigests,
  cwd,
  dockerBuildOutputArchitecture,
  createPackagingError,
  getDockerImageDetails,
  runNixpacks,
  ...restProps
}: {
  name: string;
  progressLogger: ProgressLogger;
  cwd: string;
  existingDigests: string[];
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  createPackagingError: CreatePackagingError;
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

  await progressLogger.startEvent({
    eventType: 'CALCULATE_CHECKSUM',
    description: 'Calculating checksum for caching'
  });
  const dirChecksum = await getDirectoryChecksum({
    absoluteDirectoryPath: absoluteSourceDirectoryPath,
    excludeGlobs: EXCLUDE_FROM_CHECKSUM_GLOBS
  });
  const digest = mergeHashes(
    dirChecksum,
    objectHash({
      EXCLUDE_FROM_CHECKSUM_GLOBS,
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

  const configFileName = await createTemporaryNixpacksConfigFile({
    packagingProps: nixpacksPackagingProps,
    absoluteSourceDirectoryPath
  });
  const configFilePath = join(absoluteSourceDirectoryPath, configFileName);

  let imageDetails: Awaited<ReturnType<typeof getDockerImageDetails>>;
  let buildOutput: ProcessResult;
  try {
    buildOutput = await runNixpacks({
      cwd: absoluteSourceDirectoryPath,
      args: [
        'build',
        '.',
        '--name',
        name,
        '--config',
        configFileName,
        ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : [])
      ]
    });
    imageDetails = await getDockerImageDetails(name);
  } catch (err) {
    throw createPackagingError({
      type: 'PACKAGING',
      message: `Error when building "${name}" using nixpacks .\n\nBuild process logs:\n\n${err}`
    });
  } finally {
    await remove(configFilePath);
  }

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

  const fileName = 'stp-nixpacks-tmp.json';
  await writeJson(join(absoluteSourceDirectoryPath, fileName), nixpacksConfig);
  return fileName;
};

const getNixpacksConfig = async ({
  packagingProps,
  absoluteSourceDirectoryPath
}: {
  packagingProps: NixpacksBjImagePackagingProps;
  absoluteSourceDirectoryPath: string;
}): Promise<Record<string, unknown>> => {
  const nixpacksConfigFileNames = new Set(['nixpacks.toml', 'nixpacks.json']);
  const appDirectoryContents = await readdir(absoluteSourceDirectoryPath);
  const existingNixpacksConfigFile = appDirectoryContents.find((fileName) => nixpacksConfigFileNames.has(fileName));
  let userNixpacksConfig: Record<string, unknown> = {};
  if (existingNixpacksConfigFile) {
    const existingNixpacksConfigFilePath = join(absoluteSourceDirectoryPath, existingNixpacksConfigFile);
    const parsedConfig: unknown = existingNixpacksConfigFile.endsWith('.toml')
      ? parseIni(await readFile(existingNixpacksConfigFilePath, 'utf8'))
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

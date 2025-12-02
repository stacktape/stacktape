import type { ExecaReturnValue } from 'execa';
import { join } from 'node:path';
import { getDockerImageDetails } from '@shared/utils/docker';
import { getAllFilesInDir } from '@shared/utils/fs-utils';
import { getDirectoryChecksum, mergeHashes } from '@shared/utils/hashing';
import { raiseError } from '@shared/utils/misc';
import { execNixpacks } from '@shared/utils/nixpack-exec';
import { loadFromIni, loadFromJson } from '@utils/file-loaders';
import { readdir, remove, writeJson } from 'fs-extra';
import objectHash from 'object-hash';
import { EXCLUDE_FROM_CHECKSUM_GLOBS } from './_shared';

export const buildUsingNixpacks = async ({
  name,
  progressLogger,
  existingDigests,
  cwd,
  dockerBuildOutputArchitecture,
  ...restProps
}: {
  name: string;
  progressLogger: ProgressLogger;
  cwd: string;
  existingDigests: string[];
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
} & NixpacksBjImagePackagingProps): Promise<PackagingOutput> => {
  const { buildImage, phases, providers, startCmd, startOnlyIncludeFiles, startRunImage, sourceDirectoryPath } =
    restProps;
  const nixpacksPackagingProps = {
    buildImage,
    phases,
    providers,
    startCmd,
    startOnlyIncludeFiles,
    startRunImage,
    sourceDirectoryPath
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
  let buildOutput: ExecaReturnValue<string>;
  try {
    buildOutput = await execNixpacks({
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
    raiseError({
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
}): Promise<Record<string, any>> => {
  const nixpacksConfigFileNames = ['nixpacks.toml', 'nixpacks.json'];
  const appDirectoryContents = await readdir(absoluteSourceDirectoryPath);
  const existingNixpacksConfigFile = appDirectoryContents.find((fileName) =>
    nixpacksConfigFileNames.includes(fileName)
  );
  let userNixpacksConfig: Record<string, any> = {};
  if (existingNixpacksConfigFile) {
    const existingNixpacksConfigFilePath = join(absoluteSourceDirectoryPath, existingNixpacksConfigFile);
    userNixpacksConfig = existingNixpacksConfigFile.endsWith('.toml')
      ? await loadFromIni(existingNixpacksConfigFilePath)
      : await loadFromJson(existingNixpacksConfigFilePath);
  }

  const {
    sourceDirectoryPath: _,
    startCmd,
    startOnlyIncludeFiles,
    startRunImage,
    phases,
    ...restNixpackProps
  } = packagingProps;

  const finalConfig: Record<string, any> = {
    ...userNixpacksConfig,
    ...restNixpackProps
  };
  if (phases) {
    const formattedPhases = phases.reduce((finalPhases, phase) => {
      const { name, ...phaseProps } = phase;

      finalPhases[name] = { ...phaseProps };
      return finalPhases;
    }, {});
    finalConfig.phases = { ...(finalConfig.phases || {}), ...formattedPhases };
  }
  if (!finalConfig.start && (startCmd || startOnlyIncludeFiles || startRunImage)) {
    finalConfig.start = {};
  }
  if (startCmd) {
    finalConfig.start.cmd = startCmd;
  }
  if (startOnlyIncludeFiles) {
    finalConfig.start.onlyIncludeFiles = startOnlyIncludeFiles;
  }
  if (startRunImage) {
    finalConfig.start.runImage = startRunImage;
  }
  return finalConfig;
};
